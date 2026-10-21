import { Navbar, Footer } from "@/components/layouts";
import { Hero } from "@/pages/HomePage/sections";

const HomePage = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
