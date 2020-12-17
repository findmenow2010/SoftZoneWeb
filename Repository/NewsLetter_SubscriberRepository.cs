using Microsoft.EntityFrameworkCore;
using SoftZone_WebSite.Models;
using SoftZone_WebSite.Repository.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Repository
{
    public class NewsLetter_SubscriberRepository : GenericRepository<NewsLetterSubscriber>, INewsLetter_SubscriberRepository
    {
        private readonly SoftZone_Context context;

        public NewsLetter_SubscriberRepository(SoftZone_Context context) : base(context)
        {
            this.context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<bool> SubscribedBefore(string Email)
        {
            if (string.IsNullOrEmpty(Email)) { return false; }
            var entity = await context.Set<NewsLetterSubscriber>().FirstOrDefaultAsync(x => x.Email.Trim().ToLower().Equals(Email.Trim().ToLower()));
            return entity != null;
        }
    }
}
