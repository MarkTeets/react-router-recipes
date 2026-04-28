import type { Route } from "./+types/recipes";
import {
  data,
  Form,
  Link,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import { db } from "~/db.server";
import {
  RecipeCard,
  RecipeDetailWrapper,
  RecipeListWrapper,
  RecipePageWrapper,
} from "~/components/recipes";
import { DeleteButton, PrimaryButton, SearchBar } from "~/components/form";
import { CalendarIcon, PlusIcon } from "~/components/icons";
import {
  useSaveRecipeNameFetcher,
  useSaveRecipeTotalTimeFetcher,
} from "~/utils/hooks";
import { mealPlanIsOpeningOrClosing } from "~/utils/revalidation";
import { getUserFromContext } from "~/utils/getUserFromContext";
import classNames from "classnames";
import { useBuildSearchParams } from "~/utils/misc";

// Needed to attach headers from loader to response. Set-Cookie headers are an exception
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function shouldRevalidate(arg: ShouldRevalidateFunctionArgs) {
  return !mealPlanIsOpeningOrClosing(arg);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = getUserFromContext(context);
  const url = new URL(request.url); // Gives easy access to search params on url
  const q = url.searchParams.get("q");
  const filter = url.searchParams.get("filter");

  // Example of using prisma directly in loader instead of abstracting to model file
  const recipes = await db.recipe.findMany({
    where: {
      userId: user.id,
      name: {
        contains: q ?? "",
        mode: "insensitive",
      },
      mealPlanMultiplier: filter === "mealPlanOnly" ? { not: null } : {},
    },
    select: {
      name: true,
      totalTime: true,
      mealPlanMultiplier: true,
      imageUrl: true,
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data(
    { recipes },
    {
      headers: {
        "Cache-Control": "max-age=5",
      },
    },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = getUserFromContext(context);
  const formData = await request.formData();

  switch (formData.get("_action")) {
    case "createRecipe": {
      const recipe = await db.recipe.create({
        data: {
          userId: user.id,
          name: "New Recipe",
          totalTime: "0 min",
          imageUrl: "https://via.placeholder.com/150?text=Remix+Recipes",
          instructions: "",
        },
      });

      const url = new URL(request.url); // captures search params from request
      url.pathname = `/app/recipes/${recipe.id}`;

      return redirect(url.toString()); // full path including pathname and prev search params
    }
    case "clearMealPlan": {
      await db.recipe.updateMany({
        where: {
          userId: user.id,
        },
        data: { mealPlanMultiplier: null },
      });
      return redirect("/app/recipes");
    }
    default: {
      return null;
    }
  }
}

export default function Recipes() {
  const data = useLoaderData<typeof loader>();
  const buildSearchParams = useBuildSearchParams();
  const [searchParams] = useSearchParams();
  const mealPlanOnlyFilterOn = searchParams.get("filter") === "mealPlanOnly";

  return (
    <RecipePageWrapper>
      <RecipeListWrapper>
        <div className="flex gap-4">
          <SearchBar className="grow" placeholder="Search Recipes..." />
          <Link
            reloadDocument
            to={buildSearchParams(
              "filter",
              mealPlanOnlyFilterOn ? "" : "mealPlanOnly",
            )}
            className={classNames(
              "flex flex-col justify-center border-2 border-primary rounded-md",
              "px-2 text-primary",
              mealPlanOnlyFilterOn ? "text-white bg-primary" : "text-primary",
            )}
          >
            <CalendarIcon />
          </Link>
        </div>
        <Form method="post" className="mt-4">
          {mealPlanOnlyFilterOn ? (
            <DeleteButton
              name="_action"
              value="clearMealPlan"
              className="w-full"
            >
              Clear Plan
            </DeleteButton>
          ) : (
            <PrimaryButton
              name="_action"
              value="createRecipe"
              className="w-full"
            >
              <div className="flex w-full justify-center">
                <PlusIcon />
                <span className="ml-2">Create New Recipe</span>
              </div>
            </PrimaryButton>
          )}
        </Form>
        <ul>
          {data?.recipes.map((recipe) => (
            <RecipeListItem key={recipe.id} recipe={recipe} />
          ))}
        </ul>
      </RecipeListWrapper>
      <RecipeDetailWrapper>
        <Outlet />
      </RecipeDetailWrapper>
    </RecipePageWrapper>
  );
}

type RecipeListItemProps = {
  recipe: {
    id: string;
    name: string;
    mealPlanMultiplier: number | null;
    totalTime: string;
    imageUrl: string;
  };
};

function RecipeListItem({ recipe }: RecipeListItemProps) {
  const navigation = useNavigation();
  const location = useLocation();
  const isLoading = navigation.location?.pathname.endsWith(recipe.id);
  const saveNameFetcher = useSaveRecipeNameFetcher(recipe.id);
  const saveTotalTimeFetcher = useSaveRecipeTotalTimeFetcher(recipe.id);

  const optimisticData = {
    name: saveNameFetcher.formData?.get("name")?.toString(),
    totalTime: saveTotalTimeFetcher.formData?.get("totalTime")?.toString(),
  };

  return (
    <li className="my-4" key={recipe.id}>
      <NavLink
        to={{
          pathname: recipe.id,
          search: location.search,
        }}
        prefetch="intent"
      >
        {({ isActive }) => (
          <RecipeCard
            name={optimisticData.name ?? recipe.name}
            totalTime={optimisticData.totalTime ?? recipe.totalTime}
            mealPlanMultiplier={recipe.mealPlanMultiplier}
            imageUrl={recipe.imageUrl}
            isActive={isActive}
            isLoading={isLoading}
          />
        )}
      </NavLink>
    </li>
  );
}
