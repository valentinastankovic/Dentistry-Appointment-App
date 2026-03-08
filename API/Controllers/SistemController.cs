using Microsoft.AspNetCore.Mvc;
using BazaPodataka;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SistemController : ControllerBase
    {
        [HttpPost("testni-pacijent")]
        public IActionResult DodajPacijenta()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                int r = new Random().Next(100, 999);

                var parametri = new List<SqlParameter> {
                    new SqlParameter("@ime", "Pacijent"),
                    new SqlParameter("@prezime", r.ToString()),
                    new SqlParameter("@email", $"pacijent{r}@test.com"),
                    new SqlParameter("@lozinka", "123"),
                    new SqlParameter("@uloga", "Pacijent") // Usklađeno sa bazom
                };

                // Pozivamo proceduru umesto pisanja INSERT upita
                Broker.Instance().IzvrsiProceduru("Korisnik_Insert", parametri);

                return Ok($"Dodat testni pacijent {r}!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPost("testna-usluga")]
        public IActionResult DodajUslugu()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                string[] nazivi = { "Izbeljivanje", "Popravka", "Krunica", "Snimanje" };
                string naziv = nazivi[new Random().Next(nazivi.Length)];
                decimal cena = new Random().Next(2000, 10000);

                var parametri = new List<SqlParameter> {
                    new SqlParameter("@naziv", naziv),
                    new SqlParameter("@cena", cena)
                };

                // Pozivamo proceduru za usluge
                Broker.Instance().IzvrsiProceduru("Usluga_Insert", parametri);

                return Ok($"Dodata testna usluga: {naziv}!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPost("inicijalizuj-doktora")]
        public IActionResult InicijalizujDoktora()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();

                // Prvo proveravamo da li stomatolog već postoji preko tvoje Select procedure
                var parametriLogin = new List<SqlParameter> {
                    new SqlParameter("@email", "doc@smile.com"),
                    new SqlParameter("@pass", "123")
                };

                var dt = Broker.Instance().IzvrsiUpitProcedura("Korisnik_Login", parametriLogin);

                if (dt.Rows.Count == 0)
                {
                    var parametriInsert = new List<SqlParameter> {
                        new SqlParameter("@ime", "Dr. Marko"),
                        new SqlParameter("@prezime", "Markovic"),
                        new SqlParameter("@email", "doc@smile.com"),
                        new SqlParameter("@lozinka", "123"),
                        new SqlParameter("@uloga", "Stomatolog")
                    };
                    Broker.Instance().IzvrsiProceduru("Korisnik_Insert", parametriInsert);
                    return Ok("Glavni stomatolog je kreiran!");
                }

                return Ok("Glavni stomatolog već postoji.");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }
    }
}