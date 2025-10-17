import { useForm } from "react-hook-form"
import z from "zod";
import { auth } from '../lib/auth'

const signInSchema = z.object({
  email: z.email('Digite um e-mail válido'),
  password: z.string().min(3).max(100),
});

type SignInSchema = z.infer<typeof signInSchema>;

export function SignIn(){
const {register, handleSubmit, formState} = useForm<SignInSchema>()

  async function handleSignIn({email, password}:SignInSchema){
    await auth.signIn.email({
      email,
      password,
      callbackURL:'http://localhost:5173/card'
    },{
      onError(context) {
        if(context.error.message){
          alert(context.error.message)
        }else{
          alert('falha no processo de login')
        }
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <form
        onSubmit={handleSubmit(handleSignIn)}
        className="flex flex-col gap-5 p-8 bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800"
      >
        <h1 className="text-2xl font-bold text-orange-500 text-center tracking-wide">
          Login
        </h1>

        <input
          type="email"
          placeholder="Digite seu e-mail"
          {...register("email")}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />

        <input
          type="password"
          placeholder="Digite sua senha"
          {...register("password")}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />

        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-lg px-4 py-2 mt-2 transition-colors disabled:opacity-50"
        >
          Entrar
        </button>

        <p className="text-sm text-center text-neutral-400 mt-2">
          Não tem conta?{" "}
          <a
            href="/"
            className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
          >
            Cadastre-se
          </a>
        </p>
      </form>
    </div>

  )
}
