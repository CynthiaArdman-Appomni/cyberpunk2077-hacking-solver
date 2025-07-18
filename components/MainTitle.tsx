import React from "react";
import Link from "next/link";
import styles from "../styles/MainTitle.module.scss";

interface Props {
  className?: string;
  as?: React.ElementType;
}

const MainTitle = ({ className, as = "h1" }: Props) => {
  const Tag = as;
  return (
    <Tag className={[styles.title, className].filter((s) => s).join(" ")}>
      <Link href="/solver">
        <a>NIGHT CITY RP NETRUN PROTOCOL</a>
      </Link>
    </Tag>
  );
};

export default MainTitle;
