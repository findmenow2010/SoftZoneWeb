using Microsoft.EntityFrameworkCore;
using SoftZone_WebSite.Models;
using SoftZone_WebSite.Repository.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Repository
{
    public class GenericRepository<T> : IGenericRepository<T>, IDisposable where T : class
    {
        private readonly SoftZone_Context dbcontext;
        public GenericRepository(SoftZone_Context dbcontext)
        {
            this.dbcontext = dbcontext ?? throw new ArgumentNullException(nameof(dbcontext));
        }
        public async Task<IReadOnlyList<T>> GetAll()
        {
            return await dbcontext.Set<T>().ToListAsync();
        }

        public async Task<T> GetByID(long Id)
        {
            return await dbcontext.Set<T>().FindAsync(Id);
        }
        public async Task<bool> Exists(T entity)
        {
            var res = await dbcontext.Entry(entity).GetDatabaseValuesAsync();
            return (res != null);

        }
        public void Add(T entity)
        {
             dbcontext.Set<T>().Add(entity);
        }
        public void Update(T entity)
        {
            dbcontext.Entry(entity).State = EntityState.Modified;
        }

        public  void Delete(T entity)
        {
            dbcontext.Set<T>().Remove(entity);
        }
        public async Task<int> SaveChanges()
        {
            return await dbcontext.SaveChangesAsync(); 
        }
        public void Dispose()
        {
            if (dbcontext != null)
            {
                dbcontext.Dispose();
            }
        }


    }
}
