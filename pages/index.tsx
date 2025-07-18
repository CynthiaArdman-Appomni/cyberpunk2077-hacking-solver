import Head from "next/head";
import { Container } from "react-bootstrap";
import Layout from "../components/Layout";

const Home = () => (
  <>
    <Head>
      <title>Welcome to Night City</title>
    </Head>
    <Layout>
      <Container as="main" className="d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
        <h1>Welcome to Night City</h1>
      </Container>
    </Layout>
  </>
);

export default Home;
