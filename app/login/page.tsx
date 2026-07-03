export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h1>Login Page</h1>
        <p>Esta es la página de login</p>
        <button 
          onClick={() => alert('Login con Google')}
          style={{ padding: '10px 20px', background: '#001396', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  )
}
