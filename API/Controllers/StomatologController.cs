using BazaPodataka;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using System;
using System.Collections.Generic;

namespace API.Controllers
{
    [ApiController]
    [Route("api/korisnik")]
    public class StomatologController : ControllerBase
    {
        [HttpGet("stomatolozi")]
        public IActionResult GetStomatolozi()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@uloga", "Stomatolog") };

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
                        brojTelefona = dr["brojTelefona"].ToString(),
                        brojLicence = dr["brojLicence"].ToString(),
                        mentorId = dr["mentorId"] == DBNull.Value ? null : (int?)dr["mentorId"]
                    });
                }
                return Ok(lista);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPost("stomatolozi")]
        public IActionResult Post([FromBody] System.Text.Json.JsonElement k)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@ime", k.GetProperty("ime").GetString()),
                    new SqlParameter("@prezime", k.GetProperty("prezime").GetString()),
                    new SqlParameter("@email", k.GetProperty("email").GetString()),
                    new SqlParameter("@lozinka", k.TryGetProperty("lozinka", out var p) ? p.GetString() : "stom123"),
                    new SqlParameter("@uloga", "Stomatolog"),
                    new SqlParameter("@jmbg", k.GetProperty("jmbg").GetString()),
                    new SqlParameter("@tel", k.GetProperty("brojTelefona").GetString()),
                    new SqlParameter("@licenca", k.GetProperty("brojLicence").GetString())
                };

                Broker.Instance().IzvrsiProceduru("Korisnik_Insert", parametri);
                return Ok("Stomatolog uspešno dodat!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPut("stomatolozi/{id}")]
        public IActionResult Put(int id, [FromBody] System.Text.Json.JsonElement k)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@ime", k.GetProperty("ime").GetString()),
                    new SqlParameter("@prezime", k.GetProperty("prezime").GetString()),
                    new SqlParameter("@email", k.GetProperty("email").GetString()),
                    new SqlParameter("@tel", k.GetProperty("brojTelefona").GetString()),
                    new SqlParameter("@licenca", k.GetProperty("brojLicence").GetString())
                };

                Broker.Instance().IzvrsiProceduru("Korisnik_Update", parametri);
                return Ok("Podaci stomatologa su uspešno izmenjeni!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPut("stomatolozi/{id}/dodeli-mentora")]
        public IActionResult DodeliMentora(int id, [FromBody] System.Text.Json.JsonElement body)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                int? mentorId = body.ValueKind != System.Text.Json.JsonValueKind.Null ? (int?)body.GetInt32() : null;

                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@mentorId", (object)mentorId ?? DBNull.Value)
                };

                Broker.Instance().IzvrsiProceduru("Korisnik_DodeliMentora", parametri);
                return Ok("Mentor uspešno dodeljen!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpDelete("stomatolozi/{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@id", id) };

                Broker.Instance().IzvrsiProceduru("Korisnik_Delete", parametri);
                return Ok("Stomatolog uspešno obrisan!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }
    }
}