import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <section className="flex flex-col items-center justify-center gap-6 flex-grow py-8 px-5 md:py-0 md:px-0">
        <h1 className="text-[25px] font-bold">Hekk</h1>
        <div className="relative">
          <img
            src={heroImg}
            className="mx-auto w-[170px] relative z-0"
            width="170"
            height="179"
            alt=""
          />
          <img
            src={reactLogo}
            className="absolute left-1/2 transform -translate-x-1/2 z-10 h-7 top-[34px]"
            alt="React logo"
            style={{
              transform:
                "translateX(-50%) perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg) scale(1.4)",
            }}
          />
          <img
            src={viteLogo}
            className="absolute left-1/2 transform -translate-x-1/2 z-0 h-[26px] w-auto top-[107px]"
            alt="Vite logo"
            style={{
              transform:
                "translateX(-50%) perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg) scale(0.8)",
            }}
          />
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get started</h1>
          <p className="text-gray-700 dark:text-gray-300">
            Edit{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-sm">
              src/App.tsx
            </code>{" "}
            and save to test{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-sm">
              HMR
            </code>
          </p>
        </div>
        <button
          className="px-4 py-2 text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 border-2 border-transparent rounded-md hover:border-purple-600 dark:hover:border-purple-400 transition-colors focus:outline-2 focus:outline-purple-600 focus:outline-offset-2 mb-6 font-medium"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>


      <div className="relative w-full before:absolute before:left-0 before:-top-[4.5px] before:border-[5px] before:border-transparent before:border-l-gray-300 dark:before:border-l-gray-600 after:absolute after:right-0 after:-top-[4.5px] after:border-[5px] after:border-transparent after:border-r-gray-300 dark:after:border-r-gray-600 h-px"></div>

      <section className="flex flex-col lg:flex-row border-t border-gray-300 dark:border-gray-600 text-left">
        <div className="flex-1 p-8 md:p-8 border-r border-gray-300 dark:border-gray-600 lg:border-b-0 lg:border-r border-b lg:border-b-0">
          <svg className="mb-4 w-5 h-5" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2 className="text-2xl font-semibold mb-2">Documentation</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            Your questions, answered
          </p>
          <ul className="flex flex-col gap-2 md:flex-row md:gap-2 md:flex-wrap md:justify-start">
            <li>
              <a
                href="https://vite.dev/"
                target="_blank"
                className="text-gray-900 dark:text-gray-100 text-sm rounded bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex py-1.5 px-3 items-center gap-2 hover:shadow-lg transition-shadow"
                rel="noreferrer"
              >
                <img className="h-4" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a
                href="https://react.dev/"
                target="_blank"
                className="text-gray-900 dark:text-gray-100 text-sm rounded bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex py-1.5 px-3 items-center gap-2 hover:shadow-lg transition-shadow"
                rel="noreferrer"
              >
                <img className="h-4 w-4" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div className="flex-1 p-8 md:p-8">
          <svg className="mb-4 w-5 h-5" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2 className="text-2xl font-semibold mb-2">Connect with us</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            Join the Vite community
          </p>
          <ul className="flex flex-col gap-2 md:flex-row md:gap-2 md:flex-wrap md:justify-start">
            <li>
              <a
                href="https://github.com/vitejs/vite"
                target="_blank"
                className="text-gray-900 dark:text-gray-100 text-sm rounded bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex py-1.5 px-3 items-center gap-2 hover:shadow-lg transition-shadow"
                rel="noreferrer"
              >
                <svg className="h-4 w-4" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://chat.vite.dev/"
                target="_blank"
                className="text-gray-900 dark:text-gray-100 text-sm rounded bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex py-1.5 px-3 items-center gap-2 hover:shadow-lg transition-shadow"
                rel="noreferrer"
              >
                <svg className="h-4 w-4" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a
                href="https://x.com/vite_js"
                target="_blank"
                className="text-gray-900 dark:text-gray-100 text-sm rounded bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex py-1.5 px-3 items-center gap-2 hover:shadow-lg transition-shadow"
                rel="noreferrer"
              >
                <svg className="h-4 w-4" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a
                href="https://bsky.app/profile/vite.dev"
                target="_blank"
                className="text-gray-900 dark:text-gray-100 text-sm rounded bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex py-1.5 px-3 items-center gap-2 hover:shadow-lg transition-shadow"
                rel="noreferrer"
              >
                <svg className="h-4 w-4" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="relative w-full before:absolute before:left-0 before:-top-[4.5px] before:border-[5px] before:border-transparent before:border-l-gray-300 dark:before:border-l-gray-600 after:absolute after:right-0 after:-top-[4.5px] after:border-[5px] after:border-transparent after:border-r-gray-300 dark:after:border-r-gray-600 h-px"></div>
      <section className="h-[88px] md:h-12 border-t border-gray-300 dark:border-gray-600"></section>
    </>
  );
}

export default App;
