import type { Route } from "./+types/recipe-image";
import { fileStorage, getStorageKey } from "~/recipe-image-storage.server";

export async function loader({ params }: Route.LoaderArgs) {
  const key = getStorageKey(params.recipeId);
  const file = await fileStorage.get(key);

  if (!file) {
    throw new Response("Recipe image not found", {
      status: 404,
    });
  }
  return new Response(file.stream(), {
    headers: {
      "Content-Type": file.type,
    },
  });
}
