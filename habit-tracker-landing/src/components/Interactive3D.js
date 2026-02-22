import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Interactive3D = () => {
  const mountRef = useRef(null);
  const sphereRef = useRef(null);
  const targetPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Create a beautiful gradient sphere with wireframe
    const geometry = new THREE.IcosahedronGeometry(1.2, 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x3B82F6,
      emissive: 0x1E40AF,
      emissiveIntensity: 0.3,
      shininess: 100,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphereRef.current = sphere;
    scene.add(sphere);

    // Inner solid sphere
    const innerGeometry = new THREE.IcosahedronGeometry(0.8, 2);
    const innerMaterial = new THREE.MeshPhongMaterial({
      color: 0x60A5FA,
      emissive: 0x3B82F6,
      emissiveIntensity: 0.2,
      shininess: 150,
      transparent: true,
      opacity: 0.6
    });
    const innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
    sphere.add(innerSphere);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Point lights
    const pointLight1 = new THREE.PointLight(0x3B82F6, 1.5, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xF97316, 1, 100);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    camera.position.z = 5;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (event) => {
      targetPosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      targetPosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Smooth follow cursor
      if (sphereRef.current) {
        sphereRef.current.position.x = THREE.MathUtils.lerp(
          sphereRef.current.position.x, 
          targetPosition.current.x * 3, 
          0.05
        );
        sphereRef.current.position.y = THREE.MathUtils.lerp(
          sphereRef.current.position.y, 
          targetPosition.current.y * 2, 
          0.05
        );

        // Continuous rotation
        sphereRef.current.rotation.x += 0.003;
        sphereRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };

    animate();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    currentMount.appendChild(renderer.domElement);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }} 
    />
  );
};

export default Interactive3D;