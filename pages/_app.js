import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { log } from "../services/logger";
import "../styles/globals.scss";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (url.startsWith("/netrun/")) {
        log(`Navigating to ${url}`);
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);

    if (router.asPath.startsWith("/netrun/")) {
      log(`Navigating to ${router.asPath}`);
    }

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cyberpunk-hacker.com" />
        <meta
          property="og:description"
          content="Cyberpunk 2077 Breach Protocol hacking minigame solver. Can't come up with a solution to grab all of the unlockables? We've got you covered. Start cracking, samurai."
        />
        <meta
          name="description"
          content="Cyberpunk 2077 Breach Protocol hacking minigame solver. Can't come up with a solution to grab all of the unlockables? We've got you covered. Start cracking, samurai."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
