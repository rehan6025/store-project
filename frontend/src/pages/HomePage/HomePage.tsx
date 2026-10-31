import { Navbar, Footer } from "@/components/layouts";
import { Demo, Features, Hero } from "@/pages/HomePage/sections";

const HomePage = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Demo />
        <Features />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
