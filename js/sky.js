import * as THREE from 'three';

export function createSky(scene) {
  // 🌌 Estrellas
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = [];

  for (let i = 0; i < starCount; i++) {
    positions.push(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200
    );
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // ☀️ Sol rojizo
  const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xff5500 });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(-30, 40, -50);
  scene.add(sun);

  return { stars, sun };
}
