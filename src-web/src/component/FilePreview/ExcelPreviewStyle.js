import styled from "@emotion/styled";

export const ExcelPreviewRoot = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// Sheet 切换 tab 栏（仿 Office 置于底部）
export const SheetTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  overflow-x: auto;
  flex: none;
  background: var(--bg-hover);
`;

export const SheetTab = styled.button`
  border: 1px solid ${p => (p.$active ? 'var(--accent)' : 'var(--border)')};
  background: ${p => (p.$active ? 'var(--accent)' : 'transparent')};
  color: ${p => (p.$active ? 'var(--text-accent)' : 'var(--text-primary)')};
  border-radius: var(--radius);
  padding: 3px 12px;
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    background-color: ${p => (p.$active ? 'var(--accent)' : 'var(--bg-hover)')};
  }
`;

export const TableScroller = styled.div`
  flex: 1;
  overflow: auto;
`;

// 表格内容区（relative 容器，行按 top 绝对定位实现虚拟滚动）
export const ExcelViewport = styled.div`
  position: relative;
  min-width: 100%;
`;

export const ExcelHeaderRow = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  background: var(--bg-card);
`;

// 列宽拖拽把手
export const ExcelResizeHandle = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  z-index: 4;
  touch-action: none;
  user-select: none;
  &:hover {
    background: var(--accent);
  }
`;

export const ExcelRow = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
`;

// 左侧行号（sticky 固定，横向滚动时不随之移动）
export const ExcelRowNumber = styled.div`
  flex: none;
  position: sticky;
  left: 0;
  z-index: 3;
  width: 44px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-sizing: border-box;
  border-right: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-hover);
  user-select: none;
`;

// 行高手柄（位于行号下边缘）
export const RowResizeHandle = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 7px;
  cursor: row-resize;
  z-index: 4;
  touch-action: none;
  user-select: none;
  &:hover {
    background: var(--accent);
  }
`;



export const ExcelCell = styled.div`
  flex: none;
  position: relative;
  min-height: 26px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  font-size: 0.8rem;
  color: var(--text-primary);
  background: var(--bg-card);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ExcelStatus = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  padding: 24px;
`;

// 空表顶部提示条（占一行，下面仍是空表格描边）
export const EmptySheetHint = styled.div`
  flex: none;
  text-align: center;
  padding: 10px;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--border);
`;
