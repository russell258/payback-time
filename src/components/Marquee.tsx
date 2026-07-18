import * as React from "react";

type MarqueeProps = {
  behavior?: "scroll" | "slide" | "alternate";
  direction?: "left" | "right" | "up" | "down";
  scrollamount?: number | string;
  className?: string;
  children?: React.ReactNode;
};

export function Marquee(props: MarqueeProps) {
  return React.createElement("marquee", props, props.children);
}
