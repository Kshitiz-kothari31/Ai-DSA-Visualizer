import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function AnimatedSphere() {
  const sphereRef = useRef();

  useFrame(({ clock }) => {
    sphereRef.current.rotation.x = clock.getElapsedTime() * 0.2;
    sphereRef.current.rotation.y = clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={sphereRef} scale={1.8}>
        <icosahedronGeometry args={[1, 15]} />
        <MeshDistortMaterial color="#5e60ce" attach="material" distort={0.5} speed={2} roughness={0.1} metalness={0.8} />
      </mesh>
    </Float>
  );
}

export default function Home() {
  return (
    <div className="relative h-screen w-screen bg-[#050505] overflow-hidden text-white font-sans">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <AnimatedSphere />
        </Canvas>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full sm:px-6 lg:px-8 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-center pointer-events-auto"
        >
          <div className="inline-block p-1 border border-white/10 rounded-full mb-6 bg-white/5 backdrop-blur-md">
            <span className="px-3 py-1 text-sm font-semibold tracking-wide text-indigo-300 uppercase">Version 2.0 Now Live</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
            Algorithrm Visualizer
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Write code, visualize complex data structures in real-time, and analyze complexity with AI-driven insights. Step into the future of learning.
          </p>
          
          <div className="flex space-x-6 justify-center">
            <Link to="/signup">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all"
              >
                Get Started
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-transparent border border-gray-500 text-white rounded-full font-bold text-lg hover:border-gray-300 hover:bg-white/5 transition-all"
              >
                Log In
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
