export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-5xl font-bold">
        Music Instrument Store
      </h1>

      <p className="mt-4 text-lg">
        Cloud-native marketplace powered by AWS & Next.js
      </p>

      <button className="mt-8 rounded bg-black px-6 py-3 text-white">
        Shop Now
      </button>
    </main>
  );
}