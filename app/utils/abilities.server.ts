import { db } from "~/db.server";
import { data } from "react-router";
import { type User } from "generated/prisma/client";

export async function canChangeRecipe(user: User, recipeId: string) {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId, userId: user.id },
  });

  if (recipe === null) {
    throw data(
      { message: "A recipe with that id does not exist" },
      { status: 404 },
    );
  }
}
