import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const MojeRezervacije = () => {
  const [termini, setTermini] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [izvestajModal, setIzvestajModal] = useState({ show: false, termin: null });
  const [izvestajData, setIzvestajData] = useState({ opis: '', cena: 0 });
  const [pogledajIzvestajModal, setPogledajIzvestajModal] = useState({ show: false, data: null });
  const [statusModal, setStatusModal] = useState({ 
    show: false, 
    naslov: '', 
    poruka: '', 
    tip: 'info', 
    akcija: null 
  });

  const getAuthData = () => {
    const rawId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role')?.toLowerCase()?.replace(/"/g, '');
    const cleanId = rawId ? rawId.toString().replace(/"/g, '').split(':')[0] : null;
    return { userId: cleanId, token, role };
  };

  const paleta = {
    pozadina: '#F4F2F3',
    zelenaGlavna: '#4A5D50',
    statusZavrseno: '#27AE60',
    zlato: '#F4D03F',
    crvena: '#C0392B',
    siva: '#94A7AE'
  };

  const prikaziPoruku = (naslov, poruka, tip = 'info', akcija = null) => {
    setStatusModal({ show: true, naslov, poruka, tip, akcija });
  };

  const getStatusStil = (status) => {
    const s = status?.toString().toLowerCase() || '';
    if (s.includes('cekanj') || s.includes('čekanj')) return { tekst: 'NA ČEKANJU', boja: paleta.crvena };
    if (s.includes('toku')) return { tekst: 'U TOKU', boja: paleta.zlato };
    if (s.includes('zavrsen') || s.includes('završen')) return { tekst: 'ZAVRŠENO', boja: paleta.statusZavrseno };
    if (s.includes('odbijen')) return { tekst: 'ODBIJENO', boja: paleta.crvena };
    return { tekst: 'ISTEKLO', boja: paleta.siva };
  };

  const fetchSve = useCallback(async () => {
    const { userId, token, role } = getAuthData();
    if (!userId || !token) {
      setLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const endpoint = role === 'stomatolog' 
        ? `http://localhost:5169/api/termin/stomatolog/${userId}`
        : `http://localhost:5169/api/termin/pacijent/${userId}`;

      const resTermini = await axios.get(endpoint, config);
      const podaci = resTermini.data || [];

      const prošireno = [];
      for (const t of podaci) {
        const tId = t.id || t.Id || t.ID;
        let izvestajDataZaTermin = null;
        
        // --- KLJUČNA ISPRAVKA: Ovde "hvatamo" 400 grešku da ne sruši sve ---
        try {
          const resIzv = await axios.get(`http://localhost:5169/api/termin/izvestaj/${tId}`, config);
          if (resIzv.data && resIzv.data.length > 0 && resIzv.data[0].id > 0) {
            izvestajDataZaTermin = resIzv.data[0];
          }
        } catch (e) {
          // Ignorišemo 400 grešku za nepostojeće izveštaje
          console.warn(`Izveštaj za termin ${tId} nije dostupan (Status 400/404)`);
        }
        
        prošireno.push({ ...t, izvestaj: izvestajDataZaTermin });
      }

      setTermini(prošireno);
    } catch (err) {
      console.error("Glavni fetch error:", err);
      prikaziPoruku("Greška", "Nije moguće učitati termine.");
    } finally {
      setLoading(false);
    }
  }, []);

  const azurirajStatus = async (terminId, noviStatus) => {
    const { token } = getAuthData();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`http://localhost:5169/api/termin/promeni-status/${terminId}`, { status: noviStatus }, config);
      fetchSve();
    } catch (err) {
      prikaziPoruku("Greška", "Promena statusa nije uspela.");
    }
  };

  const sacuvajIzvestaj = async () => {
    const { token } = getAuthData();
    const tId = izvestajModal.termin?.id || izvestajModal.termin?.Id || izvestajModal.termin?.ID;
    
    if (!izvestajData.opis || !tId) {
        prikaziPoruku("Upozorenje", "Opis je obavezan.");
        return;
    }

    try {
      const payload = {
        opis: izvestajData.opis,
        terminId: parseInt(tId),
        ukupnaCena: parseFloat(izvestajData.cena)
      };

      await axios.post(`http://localhost:5169/api/izvestaj`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIzvestajModal({ show: false, termin: null });
      setIzvestajData({ opis: '', cena: 0 });
      prikaziPoruku("Uspeh", "Izveštaj uspešno sačuvan!");
      fetchSve();
    } catch (err) {
      prikaziPoruku("Greška", "Slanje izveštaja nije uspelo.");
    }
  };

  const obrisiTermin = (id) => {
    prikaziPoruku("Potvrda", "Da li želite da obrišete ovaj zapis?", "confirm", async () => {
        const { token } = getAuthData();
        try {
            await axios.delete(`http://localhost:5169/api/termin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSve();
        } catch (e) { prikaziPoruku("Greška", "Brisanje nije uspelo."); }
    });
  };

  useEffect(() => {
    fetchSve();
  }, [fetchSve]);

  const { role } = getAuthData();

  return (
    <div style={{ backgroundColor: paleta.pozadina, minHeight: '100vh', padding: '120px 5% 60px' }}>
      
      {/* STATUS MODAL */}
      {statusModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '350px', textAlign: 'center' }}>
                <h3>{statusModal.naslov}</h3>
                <p>{statusModal.poruka}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                    {statusModal.tip === 'confirm' ? (
                        <>
                            <button onClick={() => { statusModal.akcija(); setStatusModal(s => ({...s, show: false})); }} style={{ background: paleta.zelenaGlavna, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Da</button>
                            <button onClick={() => setStatusModal(s => ({...s, show: false}))} style={{ background: '#eee', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Ne</button>
                        </>
                    ) : (
                        <button onClick={() => setStatusModal(s => ({...s, show: false}))} style={{ background: paleta.zelenaGlavna, color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', cursor: 'pointer' }}>OK</button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MODAL ZA KREIRANJE IZVEŠTAJA */}
      {izvestajModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '450px' }}>
                <h2 style={{color: paleta.zelenaGlavna}}>Kreiranje Izveštaja</h2>
                <textarea 
                    value={izvestajData.opis}
                    onChange={(e) => setIzvestajData({...izvestajData, opis: e.target.value})}
                    style={{ width: '100%', height: '100px', margin: '10px 0', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="Opis rada..."
                />
                <input 
                    type="number"
                    value={izvestajData.cena}
                    onChange={(e) => setIzvestajData({...izvestajData, cena: e.target.value})}
                    style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="Cena (RSD)..."
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={sacuvajIzvestaj} style={{ flex: 1, background: paleta.statusZavrseno, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Sačuvaj</button>
                    <button onClick={() => setIzvestajModal({show: false, termin: null})} style={{ flex: 1, background: '#eee', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Odustani</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL ZA PREGLED IZVEŠTAJA */}
      {pogledajIzvestajModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
                <h2 style={{ color: paleta.zelenaGlavna }}>Detalji Tretmana</h2>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '10px', margin: '15px 0', border: '1px solid #eee' }}>
                    {pogledajIzvestajModal.data?.opis || pogledajIzvestajModal.data?.Opis || "Nema opisa"}
                </div>
                <p><b>Ukupna cena:</b> {pogledajIzvestajModal.data?.ukupnaCena || pogledajIzvestajModal.data?.UkupnaCena || 0} RSD</p>
                <button onClick={() => setPogledajIzvestajModal({show: false, data: null})} style={{ width: '100%', background: paleta.zelenaGlavna, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Zatvori</button>
            </div>
        </div>
      )}

      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <h1 style={{ color: paleta.zelenaGlavna, textAlign: 'center', marginBottom: '40px' }}>Upravljanje Rezervacijama</h1>

        {loading ? <p style={{textAlign:'center'}}>Učitavanje podataka...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {termini.length === 0 ? <p style={{textAlign:'center'}}>Nema pronađenih rezervacija.</p> : termini.map((t, idx) => {
              
              const tId = t.id || t.Id || t.ID;
              const statusText = t.TrenutniStatus || t.status || t.Status || "Nepoznato";
              const statusInfo = getStatusStil(statusText);
              
              const imePacijenta = t.PacIme && t.PacPrezime ? `${t.PacIme} ${t.PacPrezime}` : (t.Pacijent || "Nepoznato");
              const imeStomatologa = t.StomIme ? `dr ${t.StomIme} ${t.StomPrezime}` : (t.Stomatolog || "Stomatolog");
              const nazivUsluge = t.UslugaNaziv || t.NazivUsluge || "Stomatološki pregled";
              const prikazVreme = t.vreme || t.Vreme || "00:00";

              return (
                <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: `8px solid ${statusInfo.boja}` }}>
                  <div>
                    <span style={{ background: statusInfo.boja, color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{statusInfo.tekst}</span>
                    <h3 style={{ margin: '10px 0 5px', color: paleta.zelenaGlavna }}>{nazivUsluge}</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
                        {role === 'stomatolog' ? `Pacijent: ${imePacijenta}` : `Stomatolog: ${imeStomatologa}`}
                    </p>
                    
                    {role === 'stomatolog' && statusInfo.tekst === 'NA ČEKANJU' && (
                        <div style={{ marginTop: '15px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => azurirajStatus(tId, 'U toku')} style={{ background: paleta.zelenaGlavna, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Prihvati</button>
                            <button onClick={() => azurirajStatus(tId, 'Odbijeno')} style={{ background: 'none', color: paleta.crvena, border: `1px solid ${paleta.crvena}`, padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Odbij</button>
                        </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: paleta.zelenaGlavna }}>
                        {prikazVreme.toString().substring(0, 5)}
                    </div>
                    <div style={{ color: '#888', fontSize: '13px', marginBottom: '10px' }}>
                        {t.datum || t.Datum ? new Date(t.datum || t.Datum).toLocaleDateString() : ""}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {role === 'stomatolog' && statusInfo.tekst === 'U TOKU' && (
                            <button 
                              onClick={async () => {
                                try {
                                  const config = { headers: { Authorization: `Bearer ${getAuthData().token}` } };
                                  const res = await axios.get(`http://localhost:5169/api/termin/izvestaj/${tId}`, config);
                                  
                                  if (res.data && res.data.length > 0) {
                                    setIzvestajData({
                                      opis: res.data[0].opis || '',
                                      cena: res.data[0].ukupnaCena || 0
                                    });
                                  }
                                } catch (err) {
                                  setIzvestajData({ opis: '', cena: 0 });
                                }
                                setIzvestajModal({ show: true, termin: t });
                              }} 
                              style={{ background: paleta.statusZavrseno, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                            >
                              Završi tretman
                            </button>
                        )}
                        
                        {t.izvestaj && (
                            <button onClick={() => setPogledajIzvestajModal({ show: true, data: t.izvestaj })} style={{ background: paleta.zlato, color: '#333', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Pregled izveštaja</button>
                        )}

                        <button onClick={() => obrisiTermin(tId)} style={{ background: paleta.crvena, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Obriši</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MojeRezervacije;