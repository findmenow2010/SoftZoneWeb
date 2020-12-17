using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Models
{
    public class SoftZone_Context : DbContext
    {
        public SoftZone_Context(DbContextOptions<SoftZone_Context> options) : base(options)
        {

        }

        public DbSet<NewsLetterSubscriber> NewsLetterSubscribers { get; set; }
    }
}
