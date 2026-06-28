import React from "react";

const Logo: React.FC = (props: any) => {
  const grid = Array.from({ length: 16 }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;

    return (row === 1 || row === 2) && (col === 1 || col === 2);
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 34px)",
          gridTemplateRows: "repeat(4, 34px)",
          gap: "24px",
        }}
      >
        {grid.map((active, index) => (
          <div
            key={index}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: active
                ? "radial-gradient(circle at 35% 35%, #fbfaf8 0%, #f3f2ef 55%, #e8e6e2 100%)"
                : "linear-gradient(180deg, #666666 0%, #5B5B5B 100%)",
              boxShadow: active
                ? `
                    inset 0 1px 1px rgba(255,255,255,.45),
                    inset 0 -1px 1px rgba(0,0,0,.08),
                    0 0 10px rgba(255,255,255,.08)
                  `
                : `
                    inset 0 1px 1px rgba(255,255,255,.05),
                    inset 0 -1px 1px rgba(0,0,0,.18)
                  `,
              transition: "all .2s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Logo;