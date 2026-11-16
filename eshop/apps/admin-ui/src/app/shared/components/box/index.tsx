"use client";

import styled from "styled-components";
import type { CSSProperties } from "react";

interface BoxProps {
  $css?: CSSProperties;
}

const Box = styled.div.attrs<BoxProps>((props) => ({
  style: props.$css,
}))<BoxProps>`
  box-sizing: border-box;
`;

export default Box;