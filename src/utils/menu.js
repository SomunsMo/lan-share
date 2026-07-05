/**
 * 根据鼠标位置、菜单实际尺寸和视口范围，计算菜单最终坐标，
 * 确保菜单完全显示在可视区域内。
 *
 * @param mouseX  鼠标在视口中的 X
 * @param mouseY  鼠标在视口中的 Y
 * @param menuWidth  菜单实际宽度（px）
 * @param menuHeight 菜单实际高度（px）
 * @param offsetX    水平偏移，默认向左偏移 10px
 * @returns { x, y } 调整后的菜单位置
 */
export function calcMenuPosition(mouseX, mouseY, menuWidth, menuHeight, offsetX = -10) {
  let x = mouseX + offsetX;
  let y = mouseY;

  if (x + menuWidth > window.innerWidth) {
    x = Math.max(4, window.innerWidth - menuWidth - 4);
  }
  if (x < 0) {
    x = 4;
  }

  if (y + menuHeight > window.innerHeight) {
    y = Math.max(4, window.innerHeight - menuHeight - 4);
  }
  if (y < 0) {
    y = 4;
  }

  return { x, y };
}
