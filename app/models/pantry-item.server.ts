//import { Prisma } from "generated/prisma/client";
import { db } from "~/db.server";
import { handleDelete } from "./utils";

export function createShelfItem(shelfId: string, name: string, userId: string) {
  return db.pantryItem.create({
    data: {
      shelfId,
      name,
      userId
    }
  })
}

export function deleteShelfItem(id: string) {
  return handleDelete(() => db.pantryItem.delete({
    where: {
      id,
    },
  }));
}
