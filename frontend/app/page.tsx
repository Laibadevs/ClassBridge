import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import RolePreview from '@/components/landing/RolePreview';
import TeacherSection from '@/components/landing/TeacherSection';
import ParentSection from '@/components/landing/ParentSection';
import ImpactStats from '@/components/landing/ImpactStats';
import CTA from '@/components/landing/CTA';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <Hero />
      <ImpactStats />
      <HowItWorks />
      <Features />
      <RolePreview />
      <TeacherSection />
      <ParentSection />
      <CTA />
      <FAQ />
      <Footer />
    </div>
  );
}
