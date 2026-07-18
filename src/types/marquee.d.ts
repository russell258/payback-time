import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      marquee: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        behavior?: string;
        direction?: string;
        scrollamount?: string | number;
        scrolldelay?: string | number;
        loop?: string | number;
      }, HTMLElement>;
    }
  }
}
