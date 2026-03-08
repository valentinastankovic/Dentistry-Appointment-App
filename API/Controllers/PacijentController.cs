using BazaPodataka;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using System;
using System.Collections.Generic;

namespace API.Controllers
{
    [ApiController]
    [Route("api/pacijent")]
    public class PacijentController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@uloga", "Pacijent") };

                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Korisnik_Select", parametri);
                var lista = new List<object>();

                foreach (DataRow dr in dt.Rows)
                {
                    lista.Add(new
                    {
                        id = (int)dr["id"],
                        ime = dr["ime"].ToString(),
                        prezime = dr["prezime"].ToString(),
                        email = dr["email"].ToString(),
                        jmbg = dr["jmbg"].ToString(),
                        brojTelefona = dr["brojTelefona"].ToString()
                    });
                }
                return Ok(lista);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPost]
        public IActionResult Post([FromBody] System.Text.Json.JsonElement k)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@ime", k.GetProperty("ime").GetString()),
                    new SqlParameter("@prezime", k.GetProperty("prezime").GetString()),
                    new SqlParameter("@email", k.GetProperty("email").GetString()),
                    new SqlParameter("@lozinka", k.TryGetProperty("lozinka", out var p) ? p.GetString() : "pac123"),
                    new SqlParameter("@uloga", "Pacijent"),
                    new SqlParameter("@jmbg", k.GetProperty("jmbg").GetString()),
                    new SqlParameter("@tel", k.GetProperty("brojTelefona").GetString())
                };

                Broker.Instance().IzvrsiProceduru("Korisnik_Insert", parametri);
                return Ok("Pacijent uspešno dodat!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] System.Text.Json.JsonElement k)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@ime", k.GetProperty("ime").GetString()),
                    new SqlParameter("@prezime", k.GetProperty("prezime").GetString()),
                    new SqlParameter("@email", k.GetProperty("email").GetString()),
                    new SqlParameter("@tel", k.GetProperty("brojTelefona").GetString())
                };

                Broker.Instance().IzvrsiProceduru("Korisnik_Update", parametri);
                return Ok("Podaci pacijenta su uspešno izmenjeni!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@id", id) };

                Broker.Instance().IzvrsiProceduru("Korisnik_Delete", parametri);
                return Ok("Pacijent je uspešno obrisan!");
            }
            catch (Exception ex) { return BadRequest("Greška: Verovatno pacijent ima zakazane termine."); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }
    }
}