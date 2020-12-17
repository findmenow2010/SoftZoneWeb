using SoftZone_WebSite.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Repository.Interface
{
    public interface INewsLetter_SubscriberRepository : IGenericRepository<NewsLetterSubscriber>
    {
        Task<bool> SubscribedBefore(string Email);
    }

    
}
