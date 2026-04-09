import React from "react";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
  type ActionFunction,
  type LoaderFunctionArgs,
} from "react-router";
import { DeleteButton, ErrorMessage, PrimaryButton } from "~/components/form";
import { PlusIcon, SaveIcon, SearchIcon } from "~/components/icons";
import {
  createShelf,
  deleteShelf,
  getAllShelves,
  saveShelfName,
} from "~/models/pantry-shelf.server";
import classNames from "classnames";
import z from "zod";
import { validateForm } from "~/utils/validation";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const shelves = await getAllShelves(q);
  //console.log(shelves);
  return { shelves };
}

const saveShelfNameSchema = z.object({
  shelfId: z.string(),
  shelfName: z.string().min(1, "Shelf name cannot be blank"),
});

const deleteShelfSchema = z.object({
  shelfId: z.string(),
});

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  switch (formData.get("_action")) {
    case "createShelf": {
      return createShelf();
    }
    case "deleteShelf": {
      return validateForm(
        formData,
        deleteShelfSchema,
        (data) => deleteShelf(data.shelfId),
        (errors) => ({
          errors,
        }),
      );
    }
    case "saveShelfName": {
      return validateForm(
        formData,
        saveShelfNameSchema,
        (data) => saveShelfName(data.shelfId, data.shelfName),
        (errors) => ({
          errors,
        }),
      );

      /* before using Zod
      // const shelfId = formData.get("shelfId");
      // const shelfName = formData.get("shelfName");
      const errors: FieldErrors = {};
      if (
        typeof shelfId === "string" &&
        typeof shelfName === "string" &&
        shelfName !== ""
      ) {
        return saveShelfName(shelfId, shelfName);
      }

      if (typeof shelfId !== "string") {
        errors["shelfId"] = "Shelf ID must be a string";
      }

      if (typeof shelfName !== "string") {
        errors["shelfName"] = "Shelf name must be a string";
      }

      if (shelfName === "") {
        errors["shelfName"] = "Shelf name must not be blank";
      }
      return { errors };
      */
    }
    default: {
      return null;
    }
  }
};

export default function Pantry() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const createShelfFetcher = useFetcher();
  const navigation = useNavigation();
  const containerRef = React.useRef<HTMLUListElement>(null);

  const isSearching = navigation.formData?.has("q");
  const isCreatingShelf =
    createShelfFetcher.formData?.get("_action") === "createShelf";

  React.useEffect(() => {
    if (!isCreatingShelf && containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [isCreatingShelf]);

  return (
    <div>
      {/* <h1>Welcome to the pantry :</h1> */}

      {/* Search filter for shelf name form */}
      <Form
        className={classNames(
          "flex border-2 border-gray-300 rounded-md",
          "focus-within:border-primary md:w-80",
          { "animate-pulse": isSearching },
        )}
      >
        <button className="px-2 mr-1 hover:bg-amber-200">
          <SearchIcon />
        </button>
        <input
          defaultValue={searchParams.get("q") ?? ""}
          type="text"
          name="q"
          autoComplete="off"
          placeholder="Search Shelves"
          className="w-full py-3 px-2 outline-none"
        />
      </Form>

      {/* Create new shelf form */}
      <createShelfFetcher.Form method="POST">
        <PrimaryButton
          name="_action"
          value="createShelf"
          isLoading={isCreatingShelf}
          className={classNames("mt-4 w-full md:w-fit", {
            "bg-primary-light": isCreatingShelf,
          })}
        >
          <PlusIcon />
          <span className="pl-2">
            {isCreatingShelf ? "Creating Shelf" : "Create Shelf"}
          </span>
        </PrimaryButton>
      </createShelfFetcher.Form>
      <ul
        ref={containerRef}
        className={classNames(
          "flex gap-8 overflow-x-auto mt-4",
          "snap-x snap-mandatory",
        )}
      >
        {data.shelves.map((shelf) => (
          <Shelf key={shelf.id} shelf={shelf} />
        ))}
      </ul>
    </div>
  );
}

type ShelfProps = {
  shelf: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
    }[];
  };
};

function Shelf({ shelf }: ShelfProps) {
  const saveShelfNameFetcher = useFetcher();
  const deleteShelfFetcher = useFetcher();
  const isDeletingShelf =
    deleteShelfFetcher.formData?.get("_action") === "deleteShelf" &&
    deleteShelfFetcher.formData?.get("shelfId") === shelf.id;
  return isDeletingShelf ? null : (
    <li
      key={shelf.id}
      className={classNames(
        "border-2 border-primary rounded-md p-4 h-fit",
        "w-[calc(100vw-2rem)] flex-none snap-center",
        "md:w-96 md:snap-none",
      )}
    >
      <saveShelfNameFetcher.Form method="POST" className="flex">
        <div className="w-full mb-2">
          <input
            type="text"
            defaultValue={shelf.name}
            name="shelfName"
            placeholder="Shelf Name"
            autoComplete="off"
            className={classNames(
              "text-2xl font-extrabold w-full outline-none",
              "border-b-2 border-b-background focus:border-b-primary",
              saveShelfNameFetcher.data?.errors?.shelfName
                ? "border-b-red-600"
                : "",
            )}
          />
          <ErrorMessage>
            {saveShelfNameFetcher.data?.errors?.shelfName}
          </ErrorMessage>
        </div>
        <button name="_action" value="saveShelfName" className="ml-4">
          <SaveIcon />
        </button>
        <input type="hidden" name="shelfId" value={shelf.id} />
        <ErrorMessage className="pl-2">
          {saveShelfNameFetcher.data?.errors?.shelfId}
        </ErrorMessage>
      </saveShelfNameFetcher.Form>
      <ul>
        {shelf.items.map((item) => (
          <li key={item.id} className="py-2">
            {item.name}
          </li>
        ))}
      </ul>
      <deleteShelfFetcher.Form method="POST" className="pt-8">
        <input type="hidden" name="shelfId" value={shelf.id} />
        <ErrorMessage className="pb-2">
          {deleteShelfFetcher.data?.errors.shelfId}
        </ErrorMessage>
        <DeleteButton name="_action" value="deleteShelf" className="w-full">
          Delete Shelf
        </DeleteButton>
      </deleteShelfFetcher.Form>
    </li>
  );
}
