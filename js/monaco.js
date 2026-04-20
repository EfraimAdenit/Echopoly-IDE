console.log("monaco.js loaded");

// Wait for DOM to be ready before initializing Monaco
document.addEventListener("DOMContentLoaded", () => {
  // Read initial language from URL, default to JavaScript
  const params = new URLSearchParams(window.location.search);
  let currentLang = params.get("lang") || "javascript";
  let editor = null;

  // Default code snippets
  const defaultSnippets = {
    javascript: `// JavaScript code here\nconsole.log("Hello, world!");`,
    python: `# Python code here\nprint("Hello, world!")`,
    html: `<!DOCTYPE html>\n<html>\n  <head><title>EchoPoly IDE</title></head>\n  <body><h1>Hello, world!</h1></body>\n</html>`,
    css: `/* CSS code here */\nbody {\n  background-color: #fff;\n}`,
    json: `{\n  "message": "Hello, world!"\n}`,
    markdown: `# Hello, world!\nThis is a markdown file.`,
    xml: `<note>\n  <body>Hello, world!</body>\n</note>`,
    sql: `-- SQL code here\nSELECT * FROM users;`,
    shell: `#!/bin/bash\necho "Hello, world!"`,
    java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}`,
    cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, world!";\n  return 0;\n}`,
    typescript: `// TypeScript code here\nlet message: string = "Hello, world!";\nconsole.log(message);`
  };

  // Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyBCcyLy_rNx-riDjmK4SUu-gZbKtDPqEYQ",
    authDomain: "echopoly-ide.firebaseapp.com",
    databaseURL: "https://echopoly-ide-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "echopoly-ide",
    storageBucket: "echopoly-ide.appspot.com",
    messagingSenderId: "290647098484",
    appId: "1:290647098484:web:61a9a5503c43d465bdbd21",
    measurementId: "G-LYBESX64E5"
  };

  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized:", !!firebase.apps.length);

  // Popup helper
  function showPopup(message, type = "success") {
    const popup = document.getElementById("popup");
    popup.textContent = message;
    popup.className = `popup ${type}`;
    popup.classList.remove("hidden");
    setTimeout(() => popup.classList.add("hidden"), 3000);
  }

  // Monaco loader path
  require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs" }
  });

  // Load Monaco
  require(["vs/editor/editor.main"], () => {
    console.log("Monaco loaded:", monaco);

    const container = document.getElementById("editor-container");
    if (!container) {
      console.error("Editor container not found");
      return;
    }


    editor = monaco.editor.create(container, {
      value: defaultSnippets[currentLang],
      language: currentLang,
      theme: "vs-dark",
      automaticLayout: true
    });
    // Expose editor globally
    window.editor = editor;
    // Fire event for editor ready
    window.dispatchEvent(new Event("monaco-editor-ready"));

    // Resize handling
    window.addEventListener("resize", () => {
      if (editor) editor.layout();
    });

    const resizeObserver = new ResizeObserver(() => {
      if (editor) editor.layout();
    });
    resizeObserver.observe(container);

    // Force layout after load
    setTimeout(() => {
      editor.layout();
    }, 100);

    // Hover provider
    monaco.languages.registerHoverProvider("javascript", {
      provideHover(model, position) {
        const wordInfo = model.getWordAtPosition(position);
        if (!wordInfo) return;
        const { word, startColumn, endColumn } = wordInfo;
        if (word === "myCustomFn") {
          return {
            range: new monaco.Range(position.lineNumber, startColumn, position.lineNumber, endColumn),
            contents: [
              {
                value: "**myCustomFn**(arg: string): number\n\nReturns the square of its input."
              }
            ]
          };
        }
      }
    });

    // Definition provider
    monaco.languages.registerDefinitionProvider("javascript", {
      provideDefinition(model, position) {
        const wordInfo = model.getWordAtPosition(position);
        if (wordInfo?.word === "myCustomFn") {
          return [
            {
              uri: model.uri,
              range: new monaco.Range(10, 1, 10, 20)
            }
          ];
        }
      }
    });

    // Language switcher
    document.getElementById("confirm-btn").addEventListener("click", () => {
      const select = document.getElementById("language-select");
      const newLang = select.value;
      if (!editor) return console.warn("Editor not ready");

      monaco.editor.setModelLanguage(editor.getModel(), newLang);
      editor.setValue(defaultSnippets[newLang] || "");
      showPopup(`Switched to ${newLang}`, "success");
    });

    // Presence tracking
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) return;
      const presenceRef = firebase.database().ref("presence/" + user.uid);
      presenceRef.set({ email: user.email, status: "online" });
      presenceRef.onDisconnect().remove();

      firebase.database().ref("presence").on("value", (snapshot) => {
        const users = snapshot.val() || {};
        const list = Object.values(users)
          .map((u) => `<li>${u.email}</li>`)
          .join("");
        document.getElementById("active-users").innerHTML = `<ul>${list}</ul>`;
      });
    });
  });
});