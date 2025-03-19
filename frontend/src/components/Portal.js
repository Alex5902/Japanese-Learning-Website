import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  const [portalNode, setPortalNode] = useState(null);

  useEffect(() => {
    // Runs on client side, so we can safely query the DOM
    const node = document.getElementById("portal-root");
    setPortalNode(node);
    setMounted(true);
  }, []);

  if (!mounted || !portalNode) return null;
  return createPortal(children, portalNode);
}
