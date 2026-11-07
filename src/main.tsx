import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";
import { initStore } from "./state/store";

initStore().finally(() => {
  render(<App />, document.getElementById("app")!);
});
