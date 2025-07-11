"use client"
import React, { useState } from "react"

const dummyImages = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  src: `https://picsum.photos/300/200?random=${i + 1}`,
  title: `Image ${i + 1}`,
}))

const Gallery: React.FC = () => {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          width: "100%",
          padding: "16px 24px",
          background: "#0078d4",
          color: "#fff",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: 1,
          marginBottom: 0,
        }}
      >
        Manim Gallery Project
      </header>
      {/* Main Content */}
      <main style={{ flex: 1, padding: 24 }}>
        <h2>Gallery</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {dummyImages.map((img) => (
            <div
              key={img.id}
              style={{
                border:
                  selected === img.id
                    ? "2px solid #0078d4"
                    : "1px solid #ccc",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                boxShadow:
                  selected === img.id
                    ? "0 2px 8px #0078d433"
                    : "0 1px 4px #0001",
                transition: "box-shadow 0.2s, border 0.2s",
              }}
              onClick={() => setSelected(img.id)}
            >
              <img
                src={img.src}
                alt={img.title}
                style={{ width: "100%", height: 120, objectFit: "cover" }}
              />
              <div style={{ padding: "8px 12px", background: "#fafafa" }}>
                <span>{img.title}</span>
              </div>
            </div>
          ))}
        </div>
        {selected !== null && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: "#f0f6ff",
              borderRadius: 8,
              boxShadow: "0 2px 8px #0078d411",
            }}
          >
            <h3>Selected Image</h3>
            <img
              src={dummyImages[selected].src}
              alt={dummyImages[selected].title}
              style={{
                width: 300,
                height: 200,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
            <div style={{ marginTop: 8 }}>
              {dummyImages[selected].title}
            </div>
          </div>
        )}
      </main>
      {/* Footer */}
      <footer
        style={{
          width: "100%",
          padding: "12px 24px",
          background: "#222",
          color: "#fff",
          textAlign: "center",
          fontSize: 14,
          letterSpacing: 0.5,
        }}
      >
        &copy; {new Date().getFullYear()} Manim Project. All rights
        reserved.
      </footer>
    </div>
  )
}

export default Gallery
