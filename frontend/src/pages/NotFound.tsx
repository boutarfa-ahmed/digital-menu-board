import { Link } from "react-router-dom";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";

export default function NotFound() {
  return (
    <>
      <PageMeta title="404 - Page introuvable | GalaxyFood" description="Page 404" />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-[180px] font-bold leading-none text-brand-500 dark:text-brand-400">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Oups ! Une erreur est survenue
        </h1>
        <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
          La page que vous cherchez n'existe pas ou a été déplacée. Retournons
          sur les rails.
        </p>
        <Link to="/dashboard" className="mt-8">
          <Button>Retour au tableau de bord</Button>
        </Link>
      </div>
    </>
  );
}
