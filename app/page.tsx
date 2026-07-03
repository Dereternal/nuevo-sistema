export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅ Servidor funcionando</h1>
        <p style={{ color: '#666' }}>La aplicación está desplegada correctamente</p>
        <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '1rem' }}>
          <a href="/login" style={{ color: '#001396' }}>Ir al login</a>
        </p>
      </div>
    </div>
  )
}
