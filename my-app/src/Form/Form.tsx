"use client";

import { useForm } from "./hook";

export const Form = () => {
  const { count, setCount, isLoading, result, error, onSubmit } = useForm();

  return (
    <>
      <form className="flex flex-col gap-4 w-full max-w-md" onSubmit={onSubmit}>
        {Array.from({ length: count }).map((_, index) => (
          <input key={index} name="from" type="text" placeholder="Откуда?" />
        ))}
        <button
          type="button"
          onClick={() => setCount(count + 1)}
          style={{ cursor: "pointer" }}
        >
          Добавить поле
        </button>

        <input name="search" type="text" placeholder="Что ищем?" />

        <button
          type="submit"
          disabled={isLoading}
          style={{ cursor: "pointer" }}
        >
          {isLoading ? "..." : "Найти"}
        </button>
      </form>
      <div className="w-full max-w-md">
        {error && <div className="text-red-600 mt-2">Ошибка: {error}</div>}
        {result && (
          <p className="mt-2 p-2 rounded w-[400px] break-words whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </p>
        )}
      </div>
    </>
  );
};
