import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Code2, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';

function AnimatedSphere() {
  const sphereRef = useRef();
  useFrame(({ clock }) => {
    sphereRef.current.rotation.x = clock.getElapsedTime() * 0.15;
    sphereRef.current.rotation.y = clock.getElapsedTime() * 0.2;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
      <mesh ref={sphereRef} scale={2.2}>
        <icosahedronGeometry args={[1, 15]} />
        <MeshDistortMaterial color="#4f46e5" attach="material" distort={0.4} speed={1.5} roughness={0.2} metalness={0.9} wireframe={true} />
      </mesh>
    </Float>
  );
}

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay }}
    className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/[0.04] transition-all group"
  >
    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      <Icon className="w-7 h-7 text-indigo-400" />
    </div>
    <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

export default function Home() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="min-h-screen w-full bg-[#030303] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="absolute top-0 w-full p-6 z-50 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center space-x-2">
            <Code2 className="w-8 h-8 text-indigo-500" />
            <span className="text-2xl font-bold tracking-widest text-white">KODA</span>
        </div>
        <div className="flex space-x-4">
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">Log In</Link>
            <Link to="/signup" className="px-5 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-gray-200 transition-colors">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center pt-20">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0 opacity-60">
          <Canvas camera={{ position: [0, 0, 6] }}>
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
            <AnimatedSphere />
          </Canvas>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-5xl mx-auto pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
            className="text-center pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="inline-block p-1 border border-indigo-500/30 rounded-full mb-8 bg-indigo-500/10 backdrop-blur-md"
            >
              <span className="px-4 py-1.5 text-xs font-bold tracking-wider text-indigo-300 uppercase">Koda OS v2.0 Now Live</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 leading-tight">
              Master Code Dynamics. <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                Predict the Future.
              </span>
            </h1>
            
            <p className="mt-4 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
              The ultimate professional suite for real-time algorithm tracing and Machine Learning driven Big-O complexity analysis.
            </p>
            
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center items-center">
              <Link to="/signup">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all flex items-center space-x-2"
                >
                  <span>Start Building</span>
                  <Zap className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link to="/login">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-transparent border border-gray-700 text-white rounded-full font-bold text-lg hover:border-gray-400 hover:bg-white/5 transition-all"
                >
                  Log In
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500"
        >
            <span className="text-xs uppercase tracking-widest mb-2 font-semibold">Discover</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-gray-500 to-transparent"></div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6 max-w-7xl mx-auto z-10 bg-[#030303]">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Engineered for Excellence</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">Stop guessing how your code executes. Koda provides deep visibility into every iteration, state change, and performance metric.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Code2}
            title="Real-Time Tracing"
            description="Visualize your code's execution step-by-step. Watch variables mutate, arrays sort, and recursion trees expand directly in the browser."
            delay={0.1}
          />
          <FeatureCard 
            icon={BrainCircuit}
            title="ML Complexity Analysis"
            description="Our custom Random Forest models analyze your Abstract Syntax Tree to predict Space and Time complexity with high confidence."
            delay={0.3}
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Secure Execution"
            description="Write logic in JavaScript, Python, or C++. Your code is executed in isolated, secure sandboxes to prevent malicious operations."
            delay={0.5}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 mt-20 text-center text-gray-500 text-sm">
        <div className="flex items-center justify-center space-x-2 mb-4">
            <Code2 className="w-5 h-5 text-indigo-500" />
            <span className="font-bold tracking-widest text-white">KODA</span>
        </div>
        <p>© 2026 Koda Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}
