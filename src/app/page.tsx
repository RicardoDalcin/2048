'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

const POSITION_NUMBER = 4;
const POSITION_SIZE = 128;
const GAP = 16;
const BOARD_DIMENSIONS =
  POSITION_SIZE * POSITION_NUMBER + GAP * (POSITION_NUMBER + 1);

type Board = number[][];

type MoveDirection = 'up' | 'down' | 'left' | 'right';

const PIECE_INFO: Record<
  number,
  { color: string; bgColor: string; fontSize: number }
> = {
  0: { color: '#ccc1b4', bgColor: '#ccc1b4', fontSize: 56 },
  2: { color: '#776e65', bgColor: '#eee4da', fontSize: 56 },
  4: { color: '#776e65', bgColor: '#ede0c8', fontSize: 56 },
  8: { color: '#f9f6f2', bgColor: '#f2b179', fontSize: 56 },
  16: { color: '#f9f6f2', bgColor: '#f59563', fontSize: 56 },
  32: { color: '#f9f6f2', bgColor: '#f67c5f', fontSize: 56 },
  64: { color: '#f9f6f2', bgColor: '#f65e3b', fontSize: 56 },
  128: { color: '#f9f6f2', bgColor: '#edcf72', fontSize: 48 },
  256: { color: '#f9f6f2', bgColor: '#edcc61', fontSize: 48 },
  512: { color: '#f9f6f2', bgColor: '#edc850', fontSize: 48 },
  1024: { color: '#f9f6f2', bgColor: '#edc53f', fontSize: 40 },
  2048: { color: '#f9f6f2', bgColor: '#edc22e', fontSize: 40 },
};

function getInitialBoard(midGame: boolean): Board {
  const initialBoard = [] as number[][];

  if (midGame) {
    for (let i = 0; i < POSITION_NUMBER; i++) {
      initialBoard.push([]);
      for (let j = 0; j < POSITION_NUMBER; j++) {
        const randomPowerOf2 = 2 ** Math.floor(Math.random() * 12);
        initialBoard[i].push(randomPowerOf2 === 1 ? 0 : randomPowerOf2);
      }
    }
  } else {
    for (let i = 0; i < POSITION_NUMBER; i++) {
      initialBoard.push([]);
      for (let j = 0; j < POSITION_NUMBER; j++) {
        initialBoard[i].push(0);
      }
    }

    const randomPosition1 = {
      row: Math.floor(Math.random() * POSITION_NUMBER),
      col: Math.floor(Math.random() * POSITION_NUMBER),
    };

    const randomPosition2 = {
      row: Math.floor(Math.random() * POSITION_NUMBER),
      col: Math.floor(Math.random() * POSITION_NUMBER),
    };

    const firstPiece = Math.random() < 0.5 ? 2 : 4;
    const secondPiece = Math.random() < 0.5 ? 2 : 4;

    initialBoard[randomPosition1.row][randomPosition1.col] = firstPiece;
    initialBoard[randomPosition2.row][randomPosition2.col] = secondPiece;
  }

  return initialBoard;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.fill();
}

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null);

  const [board, setBoard] = useState<number[][]>([]);

  function drawPiece(
    ctx: CanvasRenderingContext2D,
    row: number,
    col: number,
    value: number
  ) {
    const pieceInfo = PIECE_INFO[value];
    const boundingBox = {
      x: col * POSITION_SIZE + (col + 1) * GAP,
      y: row * POSITION_SIZE + (row + 1) * GAP,
      width: POSITION_SIZE,
      height: POSITION_SIZE,
    };

    ctx.fillStyle = pieceInfo.bgColor;
    roundedRect(
      ctx,
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height,
      6
    );

    ctx.fillStyle = pieceInfo.color;
    ctx.font = `${pieceInfo.fontSize}px sans-serif`;
    if (value) {
      const measures = ctx.measureText(String(value));
      ctx.fillText(
        String(value),
        col * POSITION_SIZE +
          (col + 1) * GAP +
          (POSITION_SIZE - measures.width) / 2,
        row * POSITION_SIZE +
          (row + 1) * GAP +
          (pieceInfo.fontSize / 2.5 + POSITION_SIZE / 2)
      );
    }
  }

  function drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#bcac9f';
    ctx.fillRect(0, 0, BOARD_DIMENSIONS, BOARD_DIMENSIONS);
  }

  const drawBoard = useCallback(
    (ctx: CanvasRenderingContext2D, board: Board) => {
      drawBackground(ctx);

      board.forEach((row, i) =>
        row.forEach((col, j) => drawPiece(ctx, i, j, col))
      );
    },
    []
  );

  function init(midGame: boolean = false) {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) {
      return;
    }

    const initialBoard = getInitialBoard(midGame);
    drawBoard(ctx, initialBoard);
    setBoard(initialBoard);
  }

  function computeNextBoard(board: Board, move: MoveDirection) {
    const newBoard = board.map((row) => [...row]);

    if (move === 'left') {
      // if left, start checking collisions from left to right, top to bottom
      // if collision, check if it's the same number, if so, merge
      // if not, move to the next position

      for (let col = 0; col < POSITION_NUMBER; col++) {
        for (let row = 0; row < POSITION_NUMBER; row++) {
          const value = newBoard[row][col];
          if (value === 0) {
            continue;
          }

          if (col === 0) {
            continue;
          }

          newBoard[row][col] = 0;

          while (col - 1 >= 0 && newBoard[row][col - 1] === 0) {
            col--;
          }

          if (newBoard[row][col - 1] === 0) {
            newBoard[row][col - 1] = value;
          } else if (newBoard[row][col - 1] === value) {
            newBoard[row][col - 1] = value * 2;
          } else {
            newBoard[row][col] = value;
          }
        }
      }
    }

    if (move === 'right') {
      // if right, start checking collisions from right to left, top to bottom
      // if collision, check if it's the same number, if so, merge
      // if not, move to the next position

      for (let col = POSITION_NUMBER - 1; col >= 0; col--) {
        for (let row = 0; row < POSITION_NUMBER; row++) {
          const value = newBoard[row][col];
          if (value === 0) {
            continue;
          }

          if (col === POSITION_NUMBER - 1) {
            continue;
          }

          newBoard[row][col] = 0;

          while (col + 1 < POSITION_NUMBER && newBoard[row][col + 1] === 0) {
            col++;
          }

          if (newBoard[row][col + 1] === 0) {
            newBoard[row][col + 1] = value;
          } else if (newBoard[row][col + 1] === value) {
            newBoard[row][col + 1] = value * 2;
          } else {
            newBoard[row][col] = value;
          }
        }
      }
    }

    if (move === 'up') {
      // if up, start checking collisions from top to bottom, left to right
      // if collision, check if it's the same number, if so, merge
      // if not, move to the next position

      for (let row = 0; row < POSITION_NUMBER; row++) {
        for (let col = 0; col < POSITION_NUMBER; col++) {
          const value = newBoard[row][col];
          if (value === 0) {
            continue;
          }

          if (row === 0) {
            continue;
          }

          newBoard[row][col] = 0;

          while (row - 1 > 0 && newBoard[row - 1][col] === 0) {
            row--;
          }

          if (newBoard[row - 1][col] === 0) {
            newBoard[row - 1][col] = value;
          } else if (newBoard[row - 1][col] === value) {
            newBoard[row - 1][col] = value * 2;
          } else {
            newBoard[row][col] = value;
          }
        }
      }
    }

    if (move === 'down') {
      // if down, start checking collisions from bottom to top, left to right
      // if collision, check if it's the same number, if so, merge
      // if not, move to the next position

      for (let row = POSITION_NUMBER - 1; row >= 0; row--) {
        for (let col = 0; col < POSITION_NUMBER; col++) {
          const value = newBoard[row][col];
          if (value === 0) {
            continue;
          }

          if (row === POSITION_NUMBER - 1) {
            continue;
          }

          newBoard[row][col] = 0;

          while (
            row + 1 < POSITION_NUMBER - 1 &&
            newBoard[row + 1][col] === 0
          ) {
            row++;
          }

          if (newBoard[row + 1][col] === 0) {
            newBoard[row + 1][col] = value;
          } else if (newBoard[row + 1][col] === value) {
            newBoard[row + 1][col] = value * 2;
          } else {
            newBoard[row][col] = value;
          }
        }
      }
    }

    return newBoard;
  }

  function getMove(key: string): MoveDirection | null {
    switch (key) {
      case 'ArrowUp':
      case 'w':
        return 'up';

      case 'ArrowDown':
      case 's':
        return 'down';

      case 'ArrowLeft':
      case 'a':
        return 'left';

      case 'ArrowRight':
      case 'd':
        return 'right';

      default:
        return null;
    }
  }

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const move = getMove(event.key);

      if (!move) {
        return;
      }

      event.preventDefault();
      const newBoard = computeNextBoard(board, move);

      const isBoardDirty = newBoard.some((row, i) =>
        row.some((col, j) => col !== board[i][j])
      );

      if (!isBoardDirty) {
        return;
      }

      const emptyPositions = [] as { row: number; col: number }[];

      newBoard.forEach((row, i) =>
        row.forEach((col, j) => {
          if (col === 0) {
            emptyPositions.push({ row: i, col: j });
          }
        })
      );

      const randomPosition =
        emptyPositions[Math.floor(Math.random() * emptyPositions.length)];

      const BIGGER_PIECE_CHANGE = 0.25;
      const newPiece = Math.random() < 1 - BIGGER_PIECE_CHANGE ? 2 : 4;
      newBoard[randomPosition.row][randomPosition.col] = newPiece;
      setBoard(newBoard);
      const ctx = canvas.current?.getContext('2d');
      ctx && drawBoard(ctx, newBoard);
    },
    [board, drawBoard]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <main className="h-screen w-screen bg-[#faf8ef] flex flex-col gap-4 items-center justify-center">
      <div className="flex gap-2 items-center">
        <button className="bg-[#bcac9f] px-3 py-1" onClick={() => init()}>
          New game
        </button>

        <button className="bg-[#bcac9f] px-3 py-1" onClick={() => init(true)}>
          Mid-game
        </button>
      </div>
      <canvas
        ref={canvas}
        className="rounded-xl"
        width={POSITION_SIZE * POSITION_NUMBER + GAP * (POSITION_NUMBER + 1)}
        height={POSITION_SIZE * POSITION_NUMBER + GAP * (POSITION_NUMBER + 1)}
      />
    </main>
  );
}
