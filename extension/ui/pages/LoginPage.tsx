import { useAuth } from "@app/ui/components/auth/AuthProvider";
import {
  Button,
  ChevronDownIcon,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DustLogo,
  LoginIcon,
  Page,
  Spinner,
  TextInput,
  HelperMessage,
} from "@dust-tt/sparkle";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const {
    user,
    isAuthenticated,
    authError,
    isUserSetup,
    handleLogin,
    handleLogout,
  } = useAuth();

  const submitLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      // Vérifier que l'email et le mot de passe ne sont pas vides
      if (!email || !password) {
        setLoginError("Veuillez remplir tous les champs");
        setIsLoggingIn(false);
        return;
      }
      
      // Envoyer les identifiants au serveur
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        redirect: 'manual', // Important pour gérer nous-mêmes la redirection
      });
      
      // Si c'est une redirection, suivre l'URL dans Location
      if (response.status === 302) {
        const redirectUrl = response.headers.get('Location');
        if (redirectUrl) {
          // Si l'authentification a réussi, appeler handleLogin
          if (redirectUrl.startsWith('/w')) {
            handleLogin(true);
            navigate('/');
            return;
          }
          // Sinon, suivre la redirection (pour Auth0 par exemple)
          window.location.href = redirectUrl;
          return;
        }
      }
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        const data = await response.json();
        setLoginError(data.error?.message || "Erreur de connexion");
        setIsLoggingIn(false);
        return;
      }
      
      // Si tout va bien, utiliser Auth0
      handleLogin(true);
      
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Une erreur s'est produite lors de la connexion");
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      try {
        if (isAuthenticated && isUserSetup) {
          navigate("/");
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    void checkAuth();
  }, [isAuthenticated, isUserSetup, navigate]);

  if (isCheckingAuth) {
    return (
      <Page>
        <div className="flex h-full w-full flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="flex flex-col h-full w-full items-center justify-center py-12">
        <div className="flex min-h-[500px] w-full max-w-lg flex-col items-center justify-center px-8 py-8 sm:px-16">
          <div className="mb-8 text-center text-gray-350">
            <DustLogo className="mx-auto mb-6 h-12 w-12" />
            <div className="w-full text-center text-2xl font-semibold tracking-tight text-gray-900">
              Connexion à Dust
            </div>
          </div>
          
          <div className="w-full space-y-4">
            <TextInput
              name="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoggingIn}
              fullWidth
            />
            
            <TextInput
              name="password"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              fullWidth
            />
            
            {loginError && (
              <HelperMessage type="error" message={loginError} />
            )}
            
            <Button
              label="Se connecter"
              onClick={submitLogin}
              disabled={isLoggingIn}
              variant="primary"
              className="mt-2 w-full"
              icon={isLoggingIn ? <Spinner size="xs" /> : <LoginIcon />}
            />
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Vous n'avez pas de compte ?{" "}
            <Link to="/signup" className="text-action-500">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </Page>
  );
};
