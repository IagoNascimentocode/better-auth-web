import { useForm } from "react-hook-form"
import z from "zod";
import { auth } from '../lib/auth'

const SignUpSchema = z.object({
  name: z.string(),
  email: z.email('Digite um e-mail válido'),
  password: z.string().min(3).max(100),
});

type SignUpSchema = z.infer<typeof SignUpSchema>;

export function SignUp(){
const {register, handleSubmit, formState} = useForm<SignUpSchema>()

  async function handleSignUp({name, email, password}:SignUpSchema){
    await auth.signUp.email({
      name,
      email,
      password,
      callbackURL:'http://localhost:5173',
    },{
      onError(context) {
        if(context.error.message){
          alert(context.error.message)
        }else{
          alert('falha no processo de criação de conta')
        }
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <form
        onSubmit={handleSubmit(handleSignUp)}
        className="flex flex-col gap-5 p-8 bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800"
      >
        <h1 className="text-2xl font-bold text-orange-500 text-center tracking-wide">
          Cadastro
        </h1>

        <input
          type="text"
          placeholder="Digite seu nome"
          {...register('name')}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />

        <input
          type="email"
          placeholder="Digite seu e-mail"
          {...register('email')}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />

        <input
          type="password"
          placeholder="Digite sua senha"
          {...register('password')}
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
          Já tem conta?{" "}
          <a
            href="/sign-in"
            className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
          >
            Faça login
          </a>
        </p>

      </form>
    </div>


  )
}
