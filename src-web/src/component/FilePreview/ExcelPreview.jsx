import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import ExcelJS from 'exceljs';
import {useTranslation} from 'react-i18next';
import {
    ExcelPreviewRoot, SheetTabs, SheetTab, TableScroller, ExcelViewport,
    ExcelHeaderRow, ExcelResizeHandle, ExcelRow, ExcelRowNumber, RowResizeHandle,
    ExcelCell, ExcelStatus, EmptySheetHint,
} from './ExcelPreviewStyle';
import {PreviewButton} from './FilePreviewStyle';

const ROW_HEIGHT = 26;
const OVERSCAN = 12;
// 虚拟滚动底部像素缓冲（行高可变，用像素而非行数保证平滑）
const OVERSCAN_PX = 400;
// 最大渲染列数（超出截断，避免宽表撑爆 DOM）
const MAX_COLS = 40;
// 空表占位网格行列数（模拟 Excel 空白表格区域的描边）
const EMPTY_ROWS = 14;
const EMPTY_COLS = 8;
// Excel 行高磅值转 px：以默认行高 26px 对应 Excel 默认 15pt 折算
const PT_TO_PX = 26 / 15;
const MIN_ROW_HEIGHT = 26;
const MAX_ROW_HEIGHT = 200;

// ARGB（8 位 AARRGGBB）转 CSS 色值，取后 6 位
const argbToHex = (argb) => (argb && argb.length >= 6 ? `#${argb.slice(-6)}` : null);

// 与 exceljs Cell.Types.Merge 一致：合并单元格的从属单元格
const MERGE_CELL_TYPE = 1;

// exceljs 对合并从属单元格的读取有缺陷：空 master 抛 TypeError、对象型 master 返回 "[object Object]"。
// 按 Excel 语义处理：从属单元格显示空白，master 单元格正常取 text（数据正确性纪律）
const safeCellText = (cell) => {
    try {
        if (cell.type === MERGE_CELL_TYPE) return '';
        return cell.text;
    } catch {
        return '';
    }
};

const safeCellFont = (cell) => {
    try {
        return cell.font || null;
    } catch {
        return null;
    }
};

const safeCellFill = (cell) => {
    try {
        return cell.fill || null;
    } catch {
        return null;
    }
};

// 列字母（A/B/...）转 0 基索引
const colLetterToIndex = (letters) => {
    let n = 0;
    for (let i = 0; i < letters.length; i++) {
        n = n * 26 + (letters.charCodeAt(i) - 64);
    }
    return n - 1;
};

// 解析 exceljs 合并范围字符串（如 'A1:B2'）为 0 基行列区间
const parseMergeRanges = (merges) => merges
    .map(range => {
        const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
        if (!m) return null;
        return {
            s: {c: colLetterToIndex(m[1]), r: parseInt(m[2], 10) - 1},
            e: {c: colLetterToIndex(m[3]), r: parseInt(m[4], 10) - 1},
        };
    })
    .filter(Boolean);

function ExcelPreview({url, reloadKey}) {
    const {t} = useTranslation();
    const [loadState, setLoadState] = useState('loading');
    const [workbook, setWorkbook] = useState(null);
    const [activeSheet, setActiveSheet] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);
    const [manualWidths, setManualWidths] = useState({});
    const [manualHeights, setManualHeights] = useState({});
    const scrollerRef = useRef(null);

    const reload = useCallback(() => {
        setWorkbook(null);
        setLoadState('loading');
        setActiveSheet('');
        setManualWidths({});
        fetch(url)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 413) throw new Error('too-large');
                    throw new Error(String(res.status));
                }
                return res.arrayBuffer();
            })
            .then(buf => new ExcelJS.Workbook().xlsx.load(buf))
            .then(wb => {
                setWorkbook(wb);
                setActiveSheet(wb.worksheets.length ? wb.worksheets[0].name : '');
                setLoadState('ready');
            })
            .catch(err => {
                setLoadState(err && err.message === 'too-large' ? 'tooLarge' : 'error');
            });
    }, [url]);

    useEffect(() => { reload(); }, [reload, reloadKey]);

    const switchSheet = (name) => {
        setActiveSheet(name);
        if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    };

    // 解析当前 sheet：显示文本二维数组 + 样式数组 + 列宽/行高（取文件真实值）
    const sheetData = useMemo(() => {
        if (!workbook || !activeSheet) return {rows: [], styles: [], colWidths: [], rowHeights: []};
        const ws = workbook.getWorksheet(activeSheet);
        if (!ws) return {rows: [], styles: [], colWidths: [], rowHeights: []};
        const maxCol = Math.min(ws.columnCount, MAX_COLS);
        const colWidths = [];
        for (let c = 1; c <= maxCol; c++) {
            const col = ws.getColumn(c);
            // Excel 列宽为字符数，近似换算 px（约 7px/字符）
            const w = col.width ? Math.round(col.width * 7) : 96;
            colWidths.push(Math.min(Math.max(w, 48), 320));
        }
        const rows = [];
        const styles = [];
        const rowHeights = [];
        for (let r = 1; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const rowArr = [];
            const styleArr = [];
            for (let c = 1; c <= maxCol; c++) {
                const cell = row.getCell(c);
                rowArr.push(safeCellText(cell));
                const font = safeCellFont(cell);
                const fill = safeCellFill(cell);
                styleArr.push({
                    fill: fill && fill.fgColor && fill.fgColor.argb ? argbToHex(fill.fgColor.argb) : null,
                    color: font && font.color && font.color.argb ? argbToHex(font.color.argb) : null,
                    bold: !!(font && font.bold),
                    italic: !!(font && font.italic),
                    size: font && font.size ? font.size : null,
                });
            }
            rows.push(rowArr);
            styles.push(styleArr);
            // 文件未设置行高时用默认 ROW_HEIGHT
            const h = row.height ? Math.round(row.height * PT_TO_PX) : ROW_HEIGHT;
            rowHeights.push(Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, h)));
        }
        return {rows, styles, colWidths, rowHeights};
    }, [workbook, activeSheet]);

    // 当前 sheet 的合并范围（0 基）
    const merges = useMemo(() => {
        if (!workbook || !activeSheet) return [];
        const ws = workbook.getWorksheet(activeSheet);
        if (!ws || !ws.model.merges || !ws.model.merges.length) return [];
        return parseMergeRanges(ws.model.merges);
    }, [workbook, activeSheet]);

    // 按行聚合合并段：{ start, end, isMaster }，从属单元格跳过渲染，master 跨列合并
    const rowSegments = useMemo(() => {
        const map = {};
        merges.forEach(m => {
            for (let r = m.s.r; r <= m.e.r; r++) {
                (map[r] = map[r] || []).push({start: m.s.c, end: m.e.c, isMaster: r === m.s.r, bottom: m.e.r});
            }
        });
        Object.keys(map).forEach(k => map[k].sort((a, b) => a.start - b.start));
        return map;
    }, [merges]);

    const {rows, styles, colWidths, rowHeights} = sheetData;
    const hasContent = rows.length > 1 || (rows.length === 1 && rows[0].some(t => t !== ''));
    const colWidthFor = (ci) => (manualWidths[ci] != null ? manualWidths[ci] : (colWidths[ci] || 96));
    // 行高：手动调节优先，其次文件真实行高
    const rowHeightFor = (r) => (manualHeights[r] != null ? manualHeights[r] : (rowHeights[r] || ROW_HEIGHT));
    // 前缀和，行 top 定位与总高度（随行高调节联动）
    const prefix = useMemo(() => {
        const arr = [0];
        for (let i = 0; i < rows.length; i++) arr.push(arr[arr.length - 1] + rowHeightFor(i));
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows.length, rowHeights, manualHeights]);

    const handleScroll = (e) => {
        const el = e.currentTarget;
        setScrollTop(el.scrollTop);
        setViewportHeight(el.clientHeight);
    };

    // 列宽拖拽：onMouseDown 后挂 window 原生 mousemove/mouseup（不依赖 pointer capture / 合成事件，最可靠）
    const onColMouseDown = (e) => {
        // 列号直接读 handle 的 data-ci（闭包传参曾因渲染复用错位，DOM 属性最可靠）
        const ci = Math.min(colWidths.length - 1, Math.max(0, Number(e.currentTarget.dataset.ci)));
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = colWidthFor(ci);
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const w = Math.min(400, Math.max(48, startWidth + dx));
            setManualWidths(prev => ({...prev, [ci]: w}));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mouseleave', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('mouseleave', onUp);
    };

    // 行高拖拽：行号从 handle 的 data-r 读取（同列宽，规避闭包错位）
    const onRowMouseDown = (e) => {
        const r = Math.min(rows.length - 1, Math.max(0, Number(e.currentTarget.dataset.r)));
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startHeight = rowHeightFor(r);
        const onMove = (ev) => {
            const dy = ev.clientY - startY;
            const h = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, startHeight + dy));
            setManualHeights(prev => ({...prev, [r]: h}));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mouseleave', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('mouseleave', onUp);
    };

    // 虚拟滚动窗口：按累计行高定位（表头占第 0 行，数据行从第 1 行起）
    const totalHeight = prefix[prefix.length - 1] || 0;
    let lo = 0;
    let hi = prefix.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (prefix[mid] <= scrollTop) lo = mid + 1;
        else hi = mid;
    }
    const start = Math.max(1, lo - 1 - OVERSCAN);
    let end = start;
    const target = scrollTop + viewportHeight + OVERSCAN_PX;
    while (end < rows.length && prefix[end] < target) end++;

    const cellInlineStyle = (st) => ({
        background: st.fill,
        color: st.color,
        fontWeight: st.bold ? 600 : 400,
        fontStyle: st.italic ? 'italic' : 'normal',
        fontSize: st.size && st.size !== 11 ? st.size : undefined,
    });

    // 合并段总宽（master 单元格需覆盖合并范围内所有列宽，去除内部竖线）
    const segWidth = (seg) => {
        let w = 0;
        for (let c = seg.start; c <= seg.end; c++) w += colWidthFor(c);
        return w;
    };

    // 按行构建单元格：跳过合并从属（占位保持列对齐）、master 跨列渲染
    const buildRowCells = (rowIndex, CellComp, withHandle) => {
        const row = rows[rowIndex] || [];
        const styleRow = styles[rowIndex] || [];
        const segs = rowSegments[rowIndex] || [];
        const n = colWidths.length;
        const cells = [];
        let ci = 0;
        while (ci < n) {
            const seg = segs.find(s => ci >= s.start && ci <= s.end);
            if (seg && !seg.isMaster) {
                cells.push(
                    <div key={ci} style={{
                        width: segWidth(seg),
                        flex: 'none',
                        borderRight: '1px solid var(--border)',
                        borderBottom: seg.bottom === rowIndex ? '1px solid var(--border)' : 'none',
                    }} />
                );
                ci = seg.end + 1;
            } else if (seg && seg.isMaster) {
                const st = styleRow[ci] || {};
                cells.push(
                    <CellComp key={ci} data-col={ci} style={{
                        width: segWidth(seg),
                        ...cellInlineStyle(st),
                        borderBottom: seg.bottom === rowIndex ? undefined : 'none',
                    }} title={row[ci]}>
                        {row[ci] || '\u00A0'}
                        {withHandle && <ExcelResizeHandle data-ci={seg.start} onMouseDown={onColMouseDown} />}
                    </CellComp>
                );
                ci = seg.end + 1;
            } else {
                const st = styleRow[ci] || {};
                cells.push(
                    <CellComp key={ci} data-col={ci} style={{width: colWidthFor(ci), ...cellInlineStyle(st)}} title={row[ci]}>
                        {row[ci] || '\u00A0'}
                        {withHandle && <ExcelResizeHandle data-ci={ci} onMouseDown={onColMouseDown} />}
                    </CellComp>
                );
                ci++;
            }
        }
        return cells;
    };

    const renderBodyRows = () => {
        const out = [];
        for (let i = start; i < end; i++) {
            out.push(
                <ExcelRow key={i} style={{top: prefix[i], height: rowHeightFor(i)}}>
                    <ExcelRowNumber>
                        {i + 1}
                        <RowResizeHandle data-r={i} onMouseDown={onRowMouseDown} />
                    </ExcelRowNumber>
                    {buildRowCells(i, ExcelCell, false)}
                </ExcelRow>
            );
        }
        return out;
    };

    const renderEmptyGrid = () => {
        const out = [];
        for (let r = 0; r < EMPTY_ROWS; r++) {
            const cells = [];
            for (let c = 0; c < EMPTY_COLS; c++) {
                cells.push(<ExcelCell key={c} style={{width: 96}}>&nbsp;</ExcelCell>);
            }
            out.push(
                <ExcelRow key={r} style={{top: r * ROW_HEIGHT, height: ROW_HEIGHT}}>
                    <ExcelRowNumber>{r + 1}</ExcelRowNumber>
                    {cells}
                </ExcelRow>
            );
        }
        return <ExcelViewport style={{height: EMPTY_ROWS * ROW_HEIGHT}}>{out}</ExcelViewport>;
    };

    if (loadState !== 'ready') {
        return (
            <ExcelPreviewRoot>
                {loadState === 'tooLarge' ? (
                    <ExcelStatus>
                        <div style={{textAlign: 'center'}}>
                            <div>{t('fileSharing.preview.excelTooLarge')}</div>
                            <div style={{marginTop: 8}}>
                                <PreviewButton onClick={reload}>{t('fileSharing.preview.refresh')}</PreviewButton>
                            </div>
                        </div>
                    </ExcelStatus>
                ) : loadState === 'error' ? (
                    <ExcelStatus>
                        <div style={{textAlign: 'center'}}>
                            <div>{t('fileSharing.preview.excelFailed')}</div>
                            <div style={{marginTop: 8}}>
                                <PreviewButton onClick={reload}>{t('fileSharing.preview.refresh')}</PreviewButton>
                            </div>
                        </div>
                    </ExcelStatus>
                ) : (
                    <ExcelStatus>{t('fileSharing.preview.loading')}</ExcelStatus>
                )}
            </ExcelPreviewRoot>
        );
    }

    return (
        <ExcelPreviewRoot>
            {!hasContent ? (
                <>
                    <EmptySheetHint>{t('fileSharing.preview.excelEmpty')}</EmptySheetHint>
                    <TableScroller>{renderEmptyGrid()}</TableScroller>
                </>
            ) : (
                <TableScroller ref={scrollerRef} onScroll={handleScroll}>
                    <ExcelViewport style={{height: totalHeight, minWidth: '100%', width: 'max-content'}}>
                        <ExcelHeaderRow style={{minWidth: '100%', height: rowHeightFor(0)}}>
                            <ExcelRowNumber>
                                1
                                <RowResizeHandle onMouseDown={(e) => onRowMouseDown(e, 0)} />
                            </ExcelRowNumber>
                            {buildRowCells(0, ExcelCell, true)}
                            {colWidths.length === 0 && <ExcelCell style={{width: 100}} />}
                        </ExcelHeaderRow>
                        {renderBodyRows()}
                    </ExcelViewport>
                </TableScroller>
            )}
            <SheetTabs>
                {workbook.worksheets.map(ws => (
                    <SheetTab key={ws.name} $active={ws.name === activeSheet} onClick={() => switchSheet(ws.name)}>
                        {ws.name}
                    </SheetTab>
                ))}
            </SheetTabs>
        </ExcelPreviewRoot>
    );
}

export default ExcelPreview;
