import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const Usluge = () => {
    const [usluge, setUsluge] = useState([]);
    const [stomatolozi, setStomatolozi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUsluga, setSelectedUsluga] = useState(null);
    const [slobodnaVremena, setSlobodnaVremena] = useState([]);

    const [statusModal, setStatusModal] = useState({
        show: false,
        naslov: '',
        poruka: '',
        tip: 'info',
        akcija: null
    });

    const prikaziPoruku = (naslov, poruka, tip = 'info', akcija = null) => {
        setStatusModal({ show: true, naslov, poruka, tip, akcija });
    };

    const dobijDanasnjiDatumBG = () => {
        const opcije = { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit' };
        const delovi = new Intl.DateTimeFormat('en-CA', opcije).formatToParts(new Date());
        const godina = delovi.find(d => d.type === 'year').value;
        const mesec = delovi.find(d => d.type === 'month').value;
        const dan = delovi.find(d => d.type === 'day').value;
        return `${godina}-${mesec}-${dan}`;
    };

    const danasnjiDatum = dobijDanasnjiDatumBG();
    const [formData, setFormData] = useState({ datum: danasnjiDatum, stomatologId: '', vreme: '' });
    const [adminFormData, setAdminFormData] = useState({ naziv: '', cena: '', opis: '' });
    const [editId, setEditId] = useState(null);

    const userRaw = localStorage.getItem('user');
    const ulogovaniKorisnik = userRaw ? JSON.parse(userRaw) : null;

    const isAdmin = ulogovaniKorisnik?.Uloga === "Admin" || localStorage.getItem('role') === "Admin";
    const jeUlogovan = !!ulogovaniKorisnik || !!localStorage.getItem('userId');

    const ucitajPodatke = async () => {
        try {
            const resU = await axios.get('http://localhost:5169/api/Usluga');
            const resS = await axios.get('http://localhost:5169/api/Korisnik/stomatolozi');
            setUsluge(resU.data || []);
            setStomatolozi(resS.data || []);
        } catch (err) {
            console.error("Greška pri učitavanju:", err);
            prikaziPoruku("Greška", "Problem sa povezivanjem na server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        ucitajPodatke();
    }, []);

    // --- FUNKCIJE ZA REZERVACIJU ---

    const handleVidiVremena = async () => {
        if (!formData.stomatologId || !formData.datum) {
            prikaziPoruku("Upozorenje", "Molimo izaberite stomatologa i datum.");
            return;
        }

        try {
            const sId = parseInt(formData.stomatologId);
            // URL mora tačno odgovarati parametrima u C# [HttpGet("slob_vremena")]
            const url = `http://localhost:5169/api/Termin/slob_vremena?stomatologId=${sId}&datum=${formData.datum}`;
            
            const res = await axios.get(url);
            let vremena = res.data || [];
            
            const izabraniDatumObj = new Date(formData.datum);
            const danUNedelji = izabraniDatumObj.getDay();
            const sad = new Date();

            // Filtriranje vremena na frontu (sigurnosna provera)
            vremena = vremena.filter(v => {
                const [h, m] = v.split(':').map(Number);
                if (formData.datum === danasnjiDatum) {
                    if (h < sad.getHours() || (h === sad.getHours() && m <= sad.getMinutes())) return false;
                }
                return danUNedelji === 6 ? (h >= 10 && h < 15) : (h >= 9 && h < 20);
            });

            vremena.sort();
            setSlobodnaVremena(vremena);

            if (vremena.length === 0) {
                prikaziPoruku("Status", "Nema slobodnih termina za odabrani dan.");
            }
        } catch (e) {
            console.error("Greška pri dohvatanju vremena:", e);
            prikaziPoruku("Greška", "Sistem nije mogao da učita slobodna vremena.");
        }
    };

    const potvrdiRezervaciju = async () => {
        const uId = ulogovaniKorisnik?.Id || ulogovaniKorisnik?.id || localStorage.getItem('userId');
        
        if (!jeUlogovan || !uId) {
            prikaziPoruku("Greška", "Morate biti prijavljeni.");
            return;
        }

        try {
            let cistoVreme = formData.vreme.replace(' h', '').trim();
            if (cistoVreme.split(':').length === 2) cistoVreme += ":00";
            if (cistoVreme.split(':')[0].length === 1) cistoVreme = "0" + cistoVreme;

            const model = {
                datum: formData.datum,
                vreme: cistoVreme,
                pacijentId: parseInt(uId),
                stomatologId: parseInt(formData.stomatologId),
                uslugaIds: [parseInt(selectedUsluga.id || selectedUsluga.Id)]
            };

            await axios.post('http://localhost:5169/api/Termin', model);

            setShowModal(false);
            prikaziPoruku("Uspeh", "Rezervacija je uspešno kreirana!");
            setFormData({ datum: danasnjiDatum, stomatologId: '', vreme: '' });
            setSlobodnaVremena([]);
        } catch (e) {
            console.error("Greška pri slanju:", e.response?.data);
            const msg = e.response?.data || "Došlo je do greške prilikom zakazivanja.";
            prikaziPoruku("Greška", typeof msg === 'string' ? msg : "Proverite podatke.");
        }
    };

    // --- ADMIN FUNKCIJE ---

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        try {
            const model = {
                naziv: adminFormData.naziv,
                cena: parseFloat(adminFormData.cena),
                opis: adminFormData.opis || "Standardna usluga"
            };

            if (editId) {
                await axios.put(`http://localhost:5169/api/Usluga/${editId}`, model);
                prikaziPoruku("Uspeh", "Usluga izmenjena.");
            } else {
                await axios.post('http://localhost:5169/api/Usluga', model);
                prikaziPoruku("Uspeh", "Usluga dodata.");
            }
            setAdminFormData({ naziv: '', cena: '', opis: '' });
            setEditId(null);
            ucitajPodatke();
        } catch (err) {
            prikaziPoruku("Greška", "Neuspešno čuvanje usluge.");
        }
    };

    const obrisiUslugu = (id) => {
        prikaziPoruku("Brisanje", "Da li ste sigurni?", "confirm", async () => {
            try {
                await axios.delete(`http://localhost:5169/api/Usluga/${id}`);
                ucitajPodatke();
            } catch (err) { prikaziPoruku("Greška", "Brisanje nije uspelo."); }
        });
    };

    const pokreniIzmenu = (u) => {
        setEditId(u.id || u.Id);
        setAdminFormData({
            naziv: u.Naziv || u.naziv,
            cena: u.Cena || u.cena,
            opis: u.Opis || u.opis
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const popuniTestnuUslugu = () => {
        const u = { n: "Krunica Zuba", c: 22000, o: "Visokokvalitetna keramika." };
        setAdminFormData({ naziv: u.n, cena: u.c, opis: u.o });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.5rem' }}>Učitavanje...</div>;

    return (
        <div style={{ backgroundColor: '#F4F2F3', minHeight: '100vh', paddingBottom: '50px' }}>

            {/* STATUS MODAL */}
            {statusModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '350px', textAlign: 'center' }}>
                        <h3 style={{ color: '#4A5D50' }}>{statusModal.naslov}</h3>
                        <p>{statusModal.poruka}</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            {statusModal.tip === 'confirm' ? (
                                <>
                                    <button onClick={() => { statusModal.akcija(); setStatusModal({...statusModal, show:false}); }} style={{ background: '#4A5D50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>Potvrdi</button>
                                    <button onClick={() => setStatusModal({...statusModal, show:false})} style={{ background: '#ccc', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>Nazad</button>
                                </>
                            ) : (
                                <button onClick={() => setStatusModal({...statusModal, show:false})} style={{ background: '#4A5D50', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '10px', cursor: 'pointer' }}>OK</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ padding: '60px 10%', textAlign: 'center' }}>
                <h1 style={{ color: '#4A5D50', fontSize: '2.5rem', marginBottom: '30px' }}>Stomatološke Usluge</h1>

                {isAdmin && (
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '40px', border: '1px solid #ddd' }}>
                        <h3 style={{marginTop: 0}}>{editId ? "Izmeni" : "Dodaj"} uslugu</h3>
                        <form onSubmit={handleAdminSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <input type="text" placeholder="Naziv" value={adminFormData.naziv} onChange={e => setAdminFormData({...adminFormData, naziv: e.target.value})} style={{padding:'8px', borderRadius:'8px', border:'1px solid #ccc'}} required />
                            <input type="number" placeholder="Cena" value={adminFormData.cena} onChange={e => setAdminFormData({...adminFormData, cena: e.target.value})} style={{padding:'8px', borderRadius:'8px', border:'1px solid #ccc'}} required />
                            <input type="text" placeholder="Opis" value={adminFormData.opis} onChange={e => setAdminFormData({...adminFormData, opis: e.target.value})} style={{padding:'8px', borderRadius:'8px', border:'1px solid #ccc', width:'200px'}} />
                            <button type="submit" style={{background:'#4A5D50', color:'white', border:'none', padding:'8px 20px', borderRadius:'8px', cursor:'pointer'}}>Sačuvaj</button>
                            {!editId && <button type="button" onClick={popuniTestnuUslugu} style={{background:'#D4A5BC', color:'white', border:'none', padding:'8px 15px', borderRadius:'8px', cursor:'pointer'}}>Test</button>}
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
                    {usluge.map((u) => (
                        <div key={u.id || u.Id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {isAdmin && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                                    <button onClick={() => pokreniIzmenu(u)} style={{ background: '#4A5D50', color: 'white', border: 'none', borderRadius: '5px', padding: '4px 8px', fontSize: '11px', cursor:'pointer' }}>Edit</button>
                                    <button onClick={() => obrisiUslugu(u.id || u.Id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '5px', padding: '4px 8px', fontSize: '11px', cursor:'pointer' }}>X</button>
                                </div>
                            )}
                            <h3 style={{ color: '#4A5D50', marginBottom: '10px' }}>{u.naziv || u.Naziv}</h3>
                            <p style={{ color: '#777', flexGrow: 1, fontSize: '14px' }}>{u.opis || u.Opis}</p>
                            <div style={{ marginTop: '15px' }}>
                                <p style={{ color: '#D4A5BC', fontWeight: 'bold', fontSize: '1.2rem' }}>{u.cena || u.Cena} RSD</p>
                                <button
                                    onClick={() => {
                                        if (!jeUlogovan) { prikaziPoruku("Prijava", "Prijavite se da biste zakazali."); return; }
                                        setSelectedUsluga(u);
                                        setShowModal(true);
                                        setSlobodnaVremena([]);
                                        setFormData({ ...formData, vreme: '' });
                                    }}
                                    style={{ background: '#4A5D50', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                                >
                                    Zakaži Termin
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL ZA ZAKAZIVANJE */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '25px', width: '400px', position: 'relative' }}>
                        <h2 style={{ color: '#4A5D50', marginTop: 0 }}>Rezervacija</h2>
                        <p>Usluga: <b>{selectedUsluga?.naziv || selectedUsluga?.Naziv}</b></p>

                        <div style={{ textAlign: 'left', marginTop: '15px' }}>
                            <label style={{fontWeight: 'bold'}}>Izaberi Stomatologa:</label>
                            <select 
                                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc' }} 
                                onChange={e => setFormData({ ...formData, stomatologId: e.target.value })} 
                                value={formData.stomatologId}
                            >
                                <option value="">-- Odaberi --</option>
                                {stomatolozi.map(s => <option key={s.id || s.Id} value={s.id || s.Id}>dr {s.ime || s.Ime} {s.prezime || s.Prezime}</option>)}
                            </select>

                            <label style={{fontWeight: 'bold'}}>Izaberi Datum:</label>
                            <input
                                type="date"
                                min={danasnjiDatum}
                                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                onChange={e => {
                                    const d = new Date(e.target.value);
                                    if (d.getDay() === 0) {
                                        prikaziPoruku("Info", "Nedelja je neradan dan.");
                                        setFormData({ ...formData, datum: danasnjiDatum });
                                    } else {
                                        setFormData({ ...formData, datum: e.target.value });
                                        setSlobodnaVremena([]);
                                    }
                                }}
                                value={formData.datum}
                            />

                            <button 
                                disabled={!formData.datum || !formData.stomatologId} 
                                onClick={handleVidiVremena} 
                                style={{ width: '100%', padding: '12px', background: (!formData.datum || !formData.stomatologId) ? '#ccc' : '#D4A5BC', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                PRIKAŽI SLOBODNE TERMINE
                            </button>

                            {(slobodnaVremena.length > 0 || formData.vreme) && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '10px', border: '1px solid #4A5D50' }}>
                                    <label style={{fontWeight:'bold'}}>Slobodna vremena:</label>
                                    <select
                                        style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px' }}
                                        value={formData.vreme}
                                        onChange={e => setFormData({ ...formData, vreme: e.target.value })}
                                    >
                                        <option value="">-- Izaberi vreme --</option>
                                        {slobodnaVremena.map(v => <option key={v} value={v}>{v.substring(0, 5)} h</option>)}
                                    </select>
                                    <button 
                                        onClick={potvrdiRezervaciju} 
                                        disabled={!formData.vreme} 
                                        style={{ width: '100%', padding: '12px', background: '#4A5D50', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
                                    >
                                        POTVRDI ZAKAZIVANJE
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowModal(false)} style={{ marginTop: '15px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', width: '100%' }}>Zatvori</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usluge;