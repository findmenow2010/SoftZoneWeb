﻿using SoftZone_WebSite.Models;
using SoftZone_WebSite.Repository.Interface;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Repository
{
    public class ContactUsRepositoryAsync : GenericRepository<ContactUs>, IContactUsRepositoryAsync
    {
        private readonly SoftZone_Context context;

        public ContactUsRepositoryAsync(SoftZone_Context context) : base(context)
        {
            this.context = context ?? throw new System.ArgumentNullException(nameof(context));
        }

        public int SaveContact(ContactUs model)
        {
             context.Set<ContactUs>().Add(model);
             context.SaveChanges();
            return model.ID;
        }
    }
}
