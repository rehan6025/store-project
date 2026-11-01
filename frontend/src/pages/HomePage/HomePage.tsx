import { Navbar, Footer } from "@/components/layouts";
import { Demo, Features, Hero, LaunchFlow } from "@/pages/HomePage/sections";

const HomePage = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Demo />
        <Features />
        <LaunchFlow />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
