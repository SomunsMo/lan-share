import styled from "@emotion/styled";

export const AudioPreviewRoot = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  padding: 24px;
`;

export const AudioPreviewBox = styled.div`
  width: 100%;
  max-width: 640px;
`;

export const AudioPreviewStatus = styled.div`
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
`;