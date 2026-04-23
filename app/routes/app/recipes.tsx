import { userContext } from "~/middleware/auth";
import type { Route } from "./+types/recipes";
import {
  data,
  Form,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useNavigation,
} from "react-router";
import { db } from "~/db.server";
import {
  RecipeCard,
  RecipeDetailWrapper,
  RecipeListWrapper,
  RecipePageWrapper,
} from "~/components/recipes";
import { PrimaryButton, SearchBar } from "~/components/form";
import { PlusIcon } from "~/components/icons";
import {
  useSaveRecipeNameFetcher,
  useSaveRecipeTotalTimeFetcher,
} from "~/utils/hooks";

// Needed to attach headers from loader to response. Set-Cookie headers are an exception
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (user === null) {
    throw redirect("/login");
  }

  const url = new URL(request.url); // Gives easy access to search params on url
  const q = url.searchParams.get("q");

  // Example of using prisma directly in loader instead of abstracting to model file
  const recipes = await db.recipe.findMany({
    where: {
      userId: user.id,
      name: {
        contains: q ?? "",
        mode: "insensitive",
      },
    },
    select: { name: true, totalTime: true, imageUrl: true, id: true },
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
  const user = context.get(userContext);
  if (user === null) throw redirect("/login");
  const recipe = await db.recipe.create({
    data: {
      userId: user.id,
      name: "New Recipe",
      totalTime: "0 min",
      imageUrl: "https://placehold.co/150?text=Router+Recipes",
      instructions: "",
    },
  });

  const url = new URL(request.url); // captures search params from request
  url.pathname = `/app/recipes/${recipe.id}`;

  return redirect(url.toString()); // full path including pathname and prev search params
}

export default function Recipes() {
  const data = useLoaderData<typeof loader>();

  return (
    <RecipePageWrapper>
      <RecipeListWrapper>
        <SearchBar placeholder="Search Recipes..." />
        <Form method="post" className="mt-4">
          <PrimaryButton>
            <div className="flex w-full justify-center">
              <PlusIcon />
              <span className="ml-2">Create New Recipe</span>
            </div>
          </PrimaryButton>
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
            imageUrl={recipe.imageUrl}
            isActive={isActive}
            isLoading={isLoading}
          />
        )}
      </NavLink>
    </li>
  );
}
