import { db } from "~/db.server";
import type { Route } from "./+types/$recipeId";
import {
  data,
  Form,
  isRouteErrorResponse,
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useRouteError,
  type ActionFunctionArgs,
} from "react-router";
import { FileUpload, parseFormData } from "@mjackson/form-data-parser";
import {
  DeleteButton,
  ErrorMessage,
  Input,
  PrimaryButton,
} from "~/components/form";
import { SaveIcon, TimeIcon, TrashIcon } from "~/components/icons";
import React from "react";
import classNames from "classnames";
import z from "zod";
import { validateForm } from "~/utils/validation";
import { handleDelete } from "~/models/utils";
import { userContext } from "~/middleware/auth";
import { useDebouncedFunction } from "~/utils/misc";
import {
  useSaveRecipeNameFetcher,
  useSaveRecipeTotalTimeFetcher,
} from "~/utils/hooks";
import { fileStorage, getStorageKey } from "~/recipe-image-storage.server";

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (user === null) throw redirect("/login");
  const recipe = await db.recipe.findUnique({
    where: {
      id: params.recipeId,
      userId: user.id,
    },
    include: {
      ingredients: {
        select: {
          id: true,
          amount: true,
          name: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (recipe === null) {
    throw data(
      { message: "A recipe with that id does not exist" },
      { status: 404 },
    );
  }
  return data(
    { recipe },
    {
      headers: {
        "Cache-Control": "max-age=5",
      },
    },
  );
}

const saveNameSchema = z.object({
  name: z.string().min(1, "Name cannot be blank"),
});

const saveTotalTimeSchema = z.object({
  totalTime: z.string().min(1, "Total time cannot be blank"),
});

const saveInstructionsSchema = z.object({
  instructions: z.string().min(1, "Instructions cannot be blank"),
});

const ingredientId = z.string().min(1, "Ingredient ID is missing");

const ingredientAmount = z.string().nullable();

const ingredientName = z.string().min(1, "Name cannot be blank");

const saveIngredientAmountSchema = z.object({
  id: ingredientId,
  amount: ingredientAmount,
});

const saveIngredientNameSchema = z.object({
  id: ingredientId,
  name: ingredientName,
});

const saveRecipeSchema = z
  .object({
    ingredientIds: z.array(ingredientId).optional(),
    ingredientAmounts: z.array(ingredientAmount).optional(),
    ingredientNames: z.array(ingredientName).optional(),
  })
  .and(saveNameSchema)
  .and(saveTotalTimeSchema)
  .and(saveInstructionsSchema)
  .refine(
    (data) =>
      data.ingredientIds?.length === data.ingredientAmounts?.length &&
      data.ingredientIds?.length === data.ingredientNames?.length,
    { message: "Ingredient arrays must all be same length" },
  );

const createIngredientSchema = z.object({
  newIngredientAmount: z.string().nullable(),
  newIngredientName: z.string().min(1, "Name cannot be blank"),
});

export async function action({ request, params, context }: ActionFunctionArgs) {
  const user = context.get(userContext);
  if (user === null) throw redirect("/login");

  const recipeId = String(params.recipeId);
  // For auth, we'll make sure the recipe is owned by the user
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId, userId: user.id },
  });

  if (recipe === null) {
    throw data(
      { message: "A recipe with that id does not exist" },
      { status: 404 },
    );
  }

  const uploadHandler = async (fileUpload: FileUpload) => {
    // Make sure that fileUpload matches input name
    if (fileUpload.fieldName === "image") {
      const key = getStorageKey(recipeId);
      await fileStorage.set(key, fileUpload);
      return fileStorage.get(key);
    }
  };

  const formData = await parseFormData(request, uploadHandler);
  const image = formData.get("image");
  if (image && typeof image !== "string" && image.size !== 0) {
    await db.recipe.update({
      where: { id: recipeId },
      data: {imageUrl: `/recipes/${recipeId}/image`}
    })
  }
  const _action = formData.get("_action");

  if (typeof _action === "string" && _action.includes("deleteIngredient")) {
    const ingredientId = _action.split(".")[1];
    return handleDelete(() => {
      // console.log("deleting ingredient:");
      // console.log(ingredientId);
      return db.ingredient.delete({ where: { id: ingredientId } });
    });
  }

  switch (formData.get("_action")) {
    case "saveRecipe": {
      // save recipe here
      return validateForm(
        formData,
        saveRecipeSchema,
        async ({
          ingredientIds,
          ingredientNames,
          ingredientAmounts,
          ...data
        }) => {
          await db.recipe.update({
            where: { id: recipeId },
            data: {
              ...data,
              ingredients: {
                updateMany:
                  ingredientIds?.map((id, index) => ({
                    where: { id },
                    data: {
                      amount: ingredientAmounts?.[index] ?? "",
                      name: ingredientNames?.[index],
                    },
                  })) ?? [],
              },
            },
          });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    case "createIngredient": {
      return validateForm(
        formData,
        createIngredientSchema,
        async ({ newIngredientAmount, newIngredientName }) => {
          await db.ingredient.create({
            data: {
              amount: newIngredientAmount ?? "",
              name: newIngredientName,
              recipeId,
            },
          });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    case "deleteRecipe": {
      await handleDelete(() => db.recipe.delete({ where: { id: recipeId } }));
      return redirect("/app/recipes");
    }
    case "saveName": {
      return validateForm(
        formData,
        saveNameSchema,
        async (data) => {
          return await db.recipe.update({ where: { id: recipeId }, data });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    case "saveTotalTime": {
      return validateForm(
        formData,
        saveTotalTimeSchema,
        async (data) => {
          return await db.recipe.update({ where: { id: recipeId }, data });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    case "saveInstructions": {
      return validateForm(
        formData,
        saveInstructionsSchema,
        async (data) => {
          return await db.recipe.update({ where: { id: recipeId }, data });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    case "saveIngredientAmount": {
      return validateForm(
        formData,
        saveIngredientAmountSchema,
        async ({ id, amount }) => {
          return await db.ingredient.update({
            where: { id },
            data: { amount: amount ?? "" },
          });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    case "saveIngredientName": {
      return validateForm(
        formData,
        saveIngredientNameSchema,
        async ({ id, name }) => {
          return await db.ingredient.update({
            where: { id },
            data: { name },
          });
        },
        (errors) => data({ errors }, { status: 400 }),
      );
    }
    default: {
      return null;
    }
  }
}

export default function RecipeDetail({ params }: Route.ComponentProps) {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const saveNameFetcher = useSaveRecipeNameFetcher(params.recipeId);
  const saveTotalTimeFetcher = useSaveRecipeTotalTimeFetcher(params.recipeId);
  const saveInstructionsFetcher = useFetcher();
  const createIngredientFetcher = useFetcher();
  const newIngredientAmountRef = React.useRef<HTMLInputElement>(null);

  const { renderedIngredients, addIngredient } = useOptimisticIngredients(
    data.recipe.ingredients,
    createIngredientFetcher.state,
  );

  // Using this state to tie save ingredient button to inputs
  const [createIngredientForm, setCreateIngredientForm] = React.useState({
    amount: "",
    name: "",
  });

  // Created for imperative saving of recipe name as user types (onChange)
  const saveName = useDebouncedFunction((name: string) => {
    return saveNameFetcher.submit(
      { _action: "saveName", name },
      { method: "POST", action: `/app/recipes/${data.recipe.id}` },
    );
  }, 1000);

  // Created for imperative saving of name as user types (onChange)
  const saveTotalTime = useDebouncedFunction((totalTime: string) => {
    return saveTotalTimeFetcher.submit(
      { _action: "saveTotalTime", totalTime },
      { method: "POST", action: `/app/recipes/${data.recipe.id}` },
    );
  }, 1000);

  // Created for imperative saving of name as user types (onChange)
  const saveInstructions = useDebouncedFunction((instructions: string) => {
    return saveInstructionsFetcher.submit(
      { _action: "saveInstructions", instructions },
      { method: "POST", action: `/app/recipes/${data.recipe.id}` },
    );
  }, 1000);

  const createIngredient = () => {
    addIngredient(createIngredientForm.amount, createIngredientForm.name);
    createIngredientFetcher.submit(
      {
        _action: "createIngredient",
        newIngredientAmount: createIngredientForm.amount,
        newIngredientName: createIngredientForm.name,
      },
      { method: "POST", action: `/app/recipes/${data.recipe.id}` },
    );
    setCreateIngredientForm({ amount: "", name: "" });
    newIngredientAmountRef.current?.focus();
  };

  return (
    <Form method="POST" encType="multipart/form-data" reloadDocument>
      {/* hidden button allows Enter key to save recipe from within form, 
      overwritten with onKeyDown for ingredients, see below */}
      <button name="_action" value="saveRecipe" className="hidden" />
      <div className="mb-2">
        <Input
          key={data.recipe?.id}
          type="text"
          placeholder="Recipe Name"
          autoComplete="off"
          className="text-2xl font-extrabold"
          name="name"
          defaultValue={data.recipe?.name}
          onChange={(e) => saveName(e.target.value)}
          error={
            !!(saveNameFetcher?.data?.errors?.name || actionData?.errors?.name)
          }
        />
        <ErrorMessage>
          {saveNameFetcher?.data?.errors?.name || actionData?.errors?.name}
        </ErrorMessage>
      </div>
      <div className="flex">
        <TimeIcon />
        <div className="ml-2 grow">
          <Input
            key={data.recipe?.id}
            type="text"
            placeholder="Time"
            autoComplete="off"
            name="totalTime"
            defaultValue={data.recipe?.totalTime}
            onChange={(e) => saveTotalTime(e.target.value)}
            error={
              !!(
                saveTotalTimeFetcher?.data?.errors?.totalTime ||
                actionData?.errors?.totalTime
              )
            }
          />
          <ErrorMessage>
            {saveTotalTimeFetcher?.data?.errors?.totalTime ||
              actionData?.errors?.totalTime}
          </ErrorMessage>
        </div>
      </div>
      <div className="grid grid-cols-[30%_auto_min-content] my-4 gap-2">
        <h2 className="font-bold text-sm pb-1">Amount</h2>
        <h2 className="font-bold text-sm pb-1">Name</h2>
        <div></div>
        {renderedIngredients.map((ingredient, idx) => (
          <IngredientRow
            key={ingredient.id}
            id={ingredient.id}
            recipeId={data.recipe.id}
            amount={ingredient.amount}
            name={ingredient.name}
            amountError={actionData?.errors?.[`ingredientAmounts.${idx}`]}
            nameError={actionData?.errors?.[`ingredientNames.${idx}`]}
            isOptimistic={ingredient.isOptimistic}
          />
        ))}
        <div>
          <Input
            ref={newIngredientAmountRef}
            type="text"
            autoComplete="off"
            name="newIngredientAmount"
            className="border-b-gray-200"
            value={createIngredientForm.amount}
            onChange={(e) =>
              setCreateIngredientForm((values) => ({
                ...values,
                amount: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createIngredient();
              }
            }}
            error={
              !!(
                createIngredientFetcher.data?.errors?.newIngredientAmount ||
                actionData?.errors?.newIngredientAmount
              )
            }
          />
          <ErrorMessage>
            {createIngredientFetcher.data?.errors?.newIngredientAmount ||
              actionData?.errors?.newIngredientAmount}
          </ErrorMessage>
        </div>
        <div>
          <Input
            type="text"
            autoComplete="off"
            name="newIngredientName"
            className="border-b-gray-200"
            value={createIngredientForm.name}
            onChange={(e) =>
              setCreateIngredientForm((values) => ({
                ...values,
                name: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createIngredient();
              }
            }}
            error={
              !!(
                createIngredientFetcher.data?.errors?.newIngredientName ||
                actionData?.errors?.newIngredientName
              )
            }
          />
          <ErrorMessage>
            {createIngredientFetcher.data?.errors?.newIngredientName ||
              actionData?.errors?.newIngredientName}
          </ErrorMessage>
        </div>
        <button
          name="_action"
          value="createIngredient"
          onClick={(e) => {
            e.preventDefault();
            createIngredient();
          }}
        >
          <SaveIcon />
        </button>
      </div>
      <label
        htmlFor="instructions"
        className="block font-bold text-sm pb-2 w-fit"
      >
        Instructions
      </label>
      <textarea
        key={data.recipe?.id}
        id="instructions"
        name="instructions"
        placeholder="Instructions go here..."
        defaultValue={data.recipe?.instructions}
        onChange={(e) => saveInstructions(e.target.value)}
        className={classNames(
          "w-full h-56 rounded-md outline-none",
          "focus:border-2 focus:p-3 focus:border-primary duration-300",
          !!(
            saveInstructionsFetcher?.data?.errors?.instructions ||
            actionData?.errors?.instructions
          )
            ? "border-2 border-red-500 p-3"
            : "",
        )}
      />
      <ErrorMessage>
        {saveInstructionsFetcher?.data?.errors?.instructions ||
          actionData?.errors?.instructions}
      </ErrorMessage>
      <label
        htmlFor="image"
        className="block font-bold text-sm pb-2 w-fit mt-4"
      >
        Image
      </label>
      <input
        type="file"
        name="image"
        key={`${data.recipe?.id}.image`}
        id="image"
      />
      <hr className="my-4" />
      <div className="flex justify-between">
        <DeleteButton name="_action" value="deleteRecipe">
          Delete this Recipe
        </DeleteButton>
        <PrimaryButton name="_action" value="saveRecipe">
          <div className="flex flex-col justify-center h-full">Save</div>
        </PrimaryButton>
      </div>
    </Form>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="bg-red-600 text-white rounded-md p-4">
        <h1 className="mb-2">
          {error.status} - {error.statusText}
        </h1>
        <p>{error.data.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-red-600 text-white rounded-md p-4">
      <h1 className="mb-2">An unexpected error occurred</h1>
    </div>
  );
}

type IngredientRowProps = {
  id: string;
  recipeId: string;
  amount: string | null;
  amountError?: string;
  name: string;
  nameError?: string;
  isOptimistic?: boolean;
};

function IngredientRow({
  id,
  recipeId,
  amount,
  amountError,
  name,
  nameError,
  isOptimistic,
}: IngredientRowProps) {
  const saveAmountFetcher = useFetcher();
  const saveNameFetcher = useFetcher();
  const deleteIngredientFetcher = useFetcher();

  // React.useEffect(() => {
  //   console.log("saveNameFetcher state changed:", saveNameFetcher.state);
  //   console.log(saveNameFetcher);
  // }, [saveNameFetcher.state]);

  const saveAmount = useDebouncedFunction((amount: string) => {
    return saveAmountFetcher.submit(
      {
        _action: "saveIngredientAmount",
        amount,
        id,
      },
      { method: "POST", action: `/app/recipes/${recipeId}` },
    );
  }, 1000);

  const saveName = useDebouncedFunction((name: string) => {
    return saveNameFetcher.submit(
      {
        _action: "saveIngredientName",
        name,
        id,
      },
      { method: "POST", action: `/app/recipes/${recipeId}` },
    );
  }, 1000);

  return deleteIngredientFetcher.state !== "idle" ? null : (
    <React.Fragment>
      <input type="hidden" name="ingredientIds[]" value={id} />
      <div>
        <Input
          type="text"
          autoComplete="off"
          name="ingredientAmounts[]"
          defaultValue={amount ?? ""}
          onChange={(e) => {
            saveAmount(e.target.value);
          }}
          disabled={isOptimistic}
          error={!!(saveAmountFetcher.data?.errors?.amount || amountError)}
        />
        <ErrorMessage>
          {saveAmountFetcher.data?.errors?.amount || amountError}
        </ErrorMessage>
      </div>
      <div>
        <Input
          type="text"
          autoComplete="off"
          name="ingredientNames[]"
          defaultValue={name ?? ""}
          onChange={(e) => {
            // console.log("pre save saveNameFetcher");
            // console.log(saveNameFetcher);
            saveName(e.target.value);
          }}
          disabled={isOptimistic}
          error={!!(saveNameFetcher.data?.errors?.name || nameError)}
        />
        <ErrorMessage>
          {saveNameFetcher.data?.errors?.name || nameError}
        </ErrorMessage>
      </div>
      <button
        name="_action"
        value={`deleteIngredient.${id}`}
        onClick={(e) => {
          e.preventDefault();
          deleteIngredientFetcher.submit(
            {
              _action: `deleteIngredient.${id}`,
            },
            { method: "POST", action: `/app/recipes/${recipeId}` },
          );
        }}
      >
        <TrashIcon />
      </button>
    </React.Fragment>
  );
}

type RenderedIngredient = {
  id: string;
  name: string;
  amount: string | null;
  isOptimistic?: boolean;
};

function useOptimisticIngredients(
  savedIngredients: RenderedIngredient[],
  createIngredientState: "idle" | "submitting" | "loading",
) {
  const [optimisticIngredients, setOptimisticIngredients] = React.useState<
    RenderedIngredient[]
  >([]);
  const renderedIngredients = [...savedIngredients, ...optimisticIngredients];

  React.useLayoutEffect(() => {
    if (createIngredientState === "idle") {
      setOptimisticIngredients([]);
    }
  }, [savedIngredients]);

  const addIngredient = (amount: string | null, name: string) => {
    setOptimisticIngredients((ingredients) => [
      ...ingredients,
      { id: createIngredientId(), name, amount, isOptimistic: true },
    ]);
  };
  return { renderedIngredients, addIngredient };
}

function createIngredientId() {
  return `${Math.round(Math.random() * 1_000_000)}`;
}
