import { FC } from "react";
import Link from "next/link";
import { Container, Row, Col } from "react-bootstrap";
import styles from "../styles/Layout.module.scss";

function PrivacyLink() {
  return (
    <Link href="/privacy">
      <a className={styles["privacy-link"]}>Privacy</a>
    </Link>
  );
}

function GitHubLink() {
  return (
    <a
      href="https://github.com/CynthiaArdman-Appomni/cyberpunk2077-hacking-solver"
      rel="noopener"
      className={styles["footer-link"]}
      target="_blank"
    >
      📂 View the code or report issues on GitHub
    </a>
  );
}

function DiscordLink() {
  return (
    <a
      href="https://discord.gg/ncrp"
      target="_blank"
      rel="noopener"
      className={styles["footer-link"]}
    >
      Enjoying the dive, Netrunner? Join Night City RP!
    </a>
  );
}

function Copyright({ className }: { className?: string }) {
  return <p className={className}>cxcorp | 2020-{new Date().getFullYear()}</p>;
}

const Layout: FC = ({ children }) => {
  return (
    <>
      <div className={styles.backdrop} />
      <div className={styles.container}>
        {children}
        <footer className={styles.footer}>
          <Container>
            <Row>
              <Col className={styles.footer__content}>
                <DiscordLink />
                <GitHubLink />
                <PrivacyLink />
                <Copyright className={styles.copyright} />
              </Col>
            </Row>
          </Container>
        </footer>
      </div>
    </>
  );
};

export default Layout;
