import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (signup(name, email, password)) {
      navigate('/editor');
    }
  };

  return (
    <div className="h-screen w-screen bg-[#050505] flex items-center justify-center text-white relative flex-col">
       <Link to="/" className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center space-x-2 transition-colors">
         <ArrowLeft className="w-5 h-5"/> <span>Back to Home</span>
       </Link>
       
       <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
       </div>

       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.5, ease: "easeOut" }}
         className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl w-full max-w-md z-10"
       >
         <h2 className="text-4xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Create Account</h2>
         <form onSubmit={handleSubmit} className="space-y-5">
           <div>
             <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
             <input 
               type="text" 
               required
               className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
               placeholder="John Doe"
               value={name}
               onChange={e => setName(e.target.value)}
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
             <input 
               type="email" 
               required
               className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
               placeholder="you@example.com"
               value={email}
               onChange={e => setEmail(e.target.value)}
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
             <input 
               type="password" 
               required
               className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
               placeholder="••••••••"
               value={password}
               onChange={e => setPassword(e.target.value)}
             />
           </div>
           <div className="pt-2">
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               type="submit" 
               className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
             >
               Sign Up
             </motion.button>
           </div>
         </form>
         <p className="mt-8 text-center text-gray-400">
           Already have an account? <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Log in</Link>
         </p>
       </motion.div>
    </div>
  );
}
