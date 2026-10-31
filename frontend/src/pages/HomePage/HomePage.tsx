import { Navbar, Footer } from "@/components/layouts";
import { Demo, Hero } from "@/pages/HomePage/sections";

const HomePage = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Demo />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
