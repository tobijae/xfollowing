import NetworkVisualizer from '@/components/NetworkVisualizer';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">X Network Visualizer</h1>
      <NetworkVisualizer />
    </main>
  );
}