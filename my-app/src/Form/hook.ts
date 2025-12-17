"use client";
import React from "react";

interface IResult {
  response: string;
}

export const useForm = () => {
  const [count, setCount] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<IResult>({} as IResult);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Collect all "Откуда?" fields (same `name` repeated)
    const fromValues = formData.getAll("from").map((v) => String(v).trim());

    // Collect "Что ищем?" field
    const searchValue = String(formData.get("search") ?? "").trim();

    setIsLoading(true);
    setError(null);
    setResult({} as IResult);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromValues, search: searchValue }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? res.statusText);
      setResult(json);
      console.log("Server result:", json);
    } catch (err) {
      setError(String(err));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return { count, setCount, isLoading, result, error, onSubmit };
};
